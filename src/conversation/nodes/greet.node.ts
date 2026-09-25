import { Injectable } from '@nestjs/common';
import {
  AgentNode,
  STANDARD_INTENTIONS,
  type NodeContext,
  type NodeResult,
} from '@guidify-ai/vapi-studio';
import type { AppSchema } from '../entry';

@Injectable()
export class GreetNode extends AgentNode<AppSchema> {
  async run(ctx: NodeContext<AppSchema>): Promise<NodeResult> {
    ctx.memory.greeted = true;
    return ctx.output.sayAndListen('Hello — how can I help you today?', {
      intentions: [
        { name: STANDARD_INTENTIONS.isPositive, boost: 5 },
        { name: STANDARD_INTENTIONS.isGoodbye, boost: 8 },
      ],
    });
  }
}
