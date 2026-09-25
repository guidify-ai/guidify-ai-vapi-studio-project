import { Injectable } from '@nestjs/common';
import {
  type ConversationEntryInput,
  type ConversationEntryPoint,
} from '@guidify-ai/vapi-studio';

/** App variable bag — extend as you grow the bot. */
export type AppVariables = {
  callerId?: string;
  callerChannel?: string;
};

export type AppMemory = {
  greeted?: boolean;
};

export type AppSchema = {
  variables: AppVariables;
  memory: AppMemory;
};

@Injectable()
export class AppConversationEntry implements ConversationEntryPoint<AppVariables> {
  createVariables(_input: ConversationEntryInput): AppVariables {
    return {};
  }
}
