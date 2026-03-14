import {
  Controller,
  Get,
  Post,
  Patch,
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

  @Delete(':id/members/:memberId')
  kickMember(
    @CurrentUser('sub') userId: string,
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.kickMember(userId, teamId, memberId);
  }

  @Patch(':id/members/:memberId/transfer')
  transferLeader(
    @CurrentUser('sub') userId: string,
    @Param('id') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamsService.transferLeader(userId, teamId, memberId);
  }

  @Get(':id/contis')
  getTeamContis(@CurrentUser('sub') userId: string, @Param('id') teamId: string) {
    return this.teamsService.getTeamContis(userId, teamId);
  }

  @Get(':id/posts')
  getTeamPosts(@CurrentUser('sub') userId: string, @Param('id') teamId: string) {
    return this.teamsService.getTeamPosts(userId, teamId);
  }

  @Post(':id/posts')
  createPost(
    @CurrentUser('sub') userId: string,
    @Param('id') teamId: string,
    @Body() dto: { content: string },
  ) {
    return this.teamsService.createPost(userId, teamId, dto);
  }

  @Delete(':id/posts/:postId')
  deletePost(
    @CurrentUser('sub') userId: string,
    @Param('id') teamId: string,
    @Param('postId') postId: string,
  ) {
    return this.teamsService.deletePost(userId, teamId, postId);
  }
}
