import { Injectable } from '@nestjs/common';
import { AgentNode, type NodeContext, type NodeResult } from '@guidify-ai/vapi-studio';
import type { AppSchema } from '../entry';

@Injectable()
export class GoodbyeNode extends AgentNode<AppSchema> {
  async run(ctx: NodeContext<AppSchema>): Promise<NodeResult> {
    return ctx.output.endCall('Thanks for calling. Goodbye.');
  }
}
