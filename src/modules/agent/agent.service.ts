import { Inject, Injectable } from '@nestjs/common';
import { AgentContextService } from './context/agent-context.service';
import { AIProvider } from './provider/ai-provider.interface';
import { AI_PROVIDER } from './provider/ai-provider.token';
import { PromptBuilderService } from './prompt/prompt-builder.service';

@Injectable()
export class AgentService {
  constructor(
    private readonly agentContextService: AgentContextService,
    private readonly promptBuilderService: PromptBuilderService,
    @Inject(AI_PROVIDER) private readonly aiProvider: AIProvider,
  ) {}

  async chat(userMessage: string): Promise<string> {
    const context = await this.agentContextService.buildContext();
    const messages = this.promptBuilderService.buildMessages(context, userMessage);

    return this.aiProvider.chat(messages);
  }
}
