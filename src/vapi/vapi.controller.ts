import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  CallTurnQueueRegistry,
  ConversationBootstrapService,
  EventService,
  ProviderIngressRepository,
  Supervisor,
  SupervisedConversationRegistry,
  VapiSseCompiler,
  extractAdvertisedTools,
  extractNewestUserText,
  extractToolResults,
  extractVapiCallId,
  extractVapiCallerNumber,
  CHANNEL_META,
  rememberCallerPhone,
  type SupervisedConversation,
  type VapiTurnContext,
} from '@guidify-ai/vapi-studio';
import { loadProjectIdentity, LOCAL_PROJECT_ID, projectVapiBasePath } from '../project/project.config';
import { brainConfig } from '../brain/brain.config';

/**
 * Vapi ingress — webhook + Custom LLM SSE.
 * One fork = one deploy = host-scoped `/vapi/...` (no project UUID in the path).
 */
@Controller('vapi')
export class VapiController {
  constructor(
    private readonly bootstrap: ConversationBootstrapService,
    private readonly registry: SupervisedConversationRegistry,
    private readonly supervisor: Supervisor,
    private readonly events: EventService,
    private readonly ingress: ProviderIngressRepository,
    private readonly turnQueues: CallTurnQueueRegistry,
  ) {}

  private get projectId(): string {
    return LOCAL_PROJECT_ID;
  }

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: Request, @Body() body: Record<string, unknown>) {
    const projectId = this.projectId;
    const message = (body.message ?? body) as Record<string, unknown>;
    const call = message.call as { id?: string } | undefined;
    const callId = call?.id ?? extractVapiCallId(body);
    const path = projectVapiBasePath() + '/webhook';
    await this.ingress.record({
      projectId,
      kind: 'webhook',
      path,
      providerCallId: callId ?? null,
      messageType: String(message.type ?? 'unknown'),
      body,
    });
    if (callId && String(message.type ?? '') === 'assistant-request') {
      await this.ensureRuntime(projectId, callId, body);
      const identity = loadProjectIdentity();
      this.events.log('info', 'ASSISTANT_REQUEST', {
        projectId,
        providerCallId: callId,
        slug: identity.slug,
      });
    }
    if (
      callId &&
      (String(message.status ?? '') === 'ended' ||
        String(message.type ?? '') === 'end-of-call-report')
    ) {
      await this.bootstrap.finalizeEnded(callId);
    }
    return { ok: true };
  }

  @Post('chat/completions')
  async chatCompletions(
    @Req() req: Request,
    @Body() body: Record<string, unknown>,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ): Promise<void> {
    const projectId = this.projectId;
    const callId =
      extractVapiCallId(body) ??
      (typeof headers['x-call-id'] === 'string' ? headers['x-call-id'] : null) ??
      (typeof headers['x-vapi-call-id'] === 'string'
        ? headers['x-vapi-call-id']
        : null);
    const callerPhoneNumber = extractVapiCallerNumber(body);
    if (callId && callerPhoneNumber) {
      rememberCallerPhone(callId, callerPhoneNumber);
    }

    const ingressPath = `${projectVapiBasePath()}/chat/completions`;
    const ingressRow = await this.ingress.record({
      projectId,
      kind: 'custom-llm',
      path: ingressPath,
      providerCallId: callId,
      messageType: 'chat.completions',
      headers: headers as Record<string, unknown>,
      body,
    });

    if (!callId) {
      await this.ingress.setResponse(ingressRow.id, 400, { error: 'missing_call_id' });
      res.status(400).json({
        error: 'missing_call_id',
        message: 'Could not correlate Custom LLM request to a Vapi call id.',
      });
      return;
    }

    let runtime = this.registry.getByProviderCallId(callId);
    if (!runtime) {
      runtime = await this.ensureRuntime(projectId, callId, body);
    }
    if (callerPhoneNumber) {
      runtime.metadata.callerPhoneNumber = callerPhoneNumber;
      runtime.metadata.channel = 'phone';
      runtime.metadata.callerId = callerPhoneNumber;
    }

    const userText =
      extractNewestUserText(
        body as { messages?: Array<{ role?: string; content?: unknown }> },
      ) ?? '';
    const toolResults = extractToolResults(
      body as { messages?: Array<{ role?: string; content?: unknown }> },
    );
    runtime.metadata[CHANNEL_META.tools] = extractAdvertisedTools(body.tools);
    const vapiCtx: VapiTurnContext = {
      callId,
      assistantId:
        typeof (body as { assistant?: { id?: string } }).assistant?.id === 'string'
          ? (body as { assistant: { id: string } }).assistant.id
          : typeof body.assistantId === 'string'
            ? body.assistantId
            : null,
      phoneNumber: callerPhoneNumber,
      customer:
        body.customer && typeof body.customer === 'object'
          ? (body.customer as Record<string, unknown>)
          : null,
      metadata:
        body.metadata && typeof body.metadata === 'object'
          ? (body.metadata as Record<string, unknown>)
          : null,
    };
    runtime.metadata[CHANNEL_META.vapi] = vapiCtx;

    const queue = this.turnQueues.get(callId);
    let aborted = false;
    req.on('close', () => {
      if (!res.writableEnded) {
        aborted = true;
        runtime.turn.interrupted = true;
      }
    });

    try {
      if (!res.headersSent) {
        res.status(200);
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }

      const outcome = await queue.runExclusive({
        userText,
        continueDraining: () => false,
        work: async (combinedUserText, meta) => {
          this.events.log('info', 'CUSTOM_LLM_TURN', {
            providerCallId: callId,
            conversationId: runtime.conversationId,
            userText: combinedUserText,
            series: meta.series,
            parts: meta.parts,
          });

          const compiler = new VapiSseCompiler({ tools: body.tools });
          const writer = {
            write: (chunk: string) => {
              if (!aborted) res.write(chunk);
            },
            end: () => {
              /* ended below */
            },
          };

          runtime.lastAssistantSpeech = [];
          const turn = await this.supervisor.handleTurn({
            runtime,
            userText: combinedUserText,
            toolResults,
            onSay: async (text) => {
              runtime.lastAssistantSpeech.push(text);
              if (!aborted) compiler.writeAssistantText(writer, text);
            },
          });

          if (aborted) return { aborted: true as const, turn };

          const { emittedTools } = await compiler.streamTerminalActions(
            writer,
            turn.actions,
          );
          return { aborted: false as const, turn, emittedTools };
        },
      });

      if (outcome.status === 'skipped') {
        const compiler = new VapiSseCompiler({ tools: body.tools });
        const writer = {
          write: (chunk: string) => res.write(chunk),
          end: () => {
            if (!res.writableEnded) res.end();
          },
        };
        compiler.replayAssistantSpeech(writer, [...runtime.lastAssistantSpeech]);
        await compiler.streamTerminalActions(writer, []);
        await this.ingress.setResponse(ingressRow.id, 200, { skipped: true });
        if (!res.writableEnded) res.end();
        return;
      }

      await this.ingress.setResponse(ingressRow.id, 200, {
        streamed: true,
        aborted: outcome.result.aborted,
      });
      if (!res.writableEnded) res.end();
    } catch (err) {
      this.events.log('error', 'CUSTOM_LLM_TURN_FAILED', {
        callId,
        projectId,
        error: err instanceof Error ? err.message : String(err),
      });
      await this.ingress.setResponse(ingressRow.id, 500, {
        error: err instanceof Error ? err.message : String(err),
      });
      if (!res.headersSent) {
        res.status(500).json({ error: 'turn_failed' });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  }

  private async ensureRuntime(
    projectId: string,
    callId: string,
    body: Record<string, unknown>,
  ): Promise<SupervisedConversation> {
    const existing = this.registry.getByProviderCallId(callId);
    if (existing) return existing;
    const brainProfileId = brainConfig.profileId;
    const callerPhoneNumber = extractVapiCallerNumber(body);
    return this.bootstrap.bootstrap({
      projectId,
      providerCallId: callId,
      brainProfileId,
      metadata: {
        messageType: 'bootstrap',
        projectId,
        brainProfileId,
        callerPhoneNumber,
      },
    });
  }
}
