import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamsController {
  constructor(private teamsService: TeamsService) {}

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateTeamDto) {
    return this.teamsService.create(userId, dto);
  }

  @Get()
  findMyTeams(@CurrentUser('sub') userId: string) {
    return this.teamsService.findMyTeams(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('sub') userId: string, @Param('id') teamId: string) {
    return this.teamsService.findOne(userId, teamId);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') teamId: string) {
    return this.teamsService.remove(userId, teamId);
  }

  @Post(':id/invite')
  createInvite(@CurrentUser('sub') userId: string, @Param('id') teamId: string) {
    return this.teamsService.createInvite(userId, teamId);
  }

  @Post('join/:token')
  join(@CurrentUser('sub') userId: string, @Param('token') token: string) {
    return this.teamsService.joinByToken(userId, token);
  }

  @Delete(':id/leave')
  leave(@CurrentUser('sub') userId: string, @Param('id') teamId: string) {
    return this.teamsService.leave(userId, teamId);
  }
}
