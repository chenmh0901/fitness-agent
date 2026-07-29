import { Injectable } from '@nestjs/common';
import { AgentLoopService } from './execution/agent-loop.service';

@Injectable()
export class AgentService {
  constructor(private readonly agentLoopService: AgentLoopService) {}

  chat(userMessage: string): Promise<string> {
    return this.agentLoopService.run(userMessage);
  }
}
