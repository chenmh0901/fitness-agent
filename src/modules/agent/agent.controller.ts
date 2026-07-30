import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentChatRequestDto } from './dto/agent-chat-request.dto';
import { AgentChatResponseDto } from './dto/agent-chat-response.dto';

@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(@Body() request: AgentChatRequestDto): Promise<AgentChatResponseDto> {
    const answer = await this.agentService.chat(request.message);

    return {
      answer,
    };
  }
}
