import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { CreateOrgDto } from './dto/create-org.dto';
import { InviteEmailDto } from './dto/invite-email.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateOrgDto) {
    return this.orgsService.create(userId, dto);
  }

  @Get()
  findMyOrgs(@CurrentUser('sub') userId: string) {
    return this.orgsService.findMyOrgs(userId);
  }

  @Get('invites')
  getMyPendingInvites(@CurrentUser('sub') userId: string) {
    return this.orgsService.getMyPendingInvites(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('sub') userId: string, @Param('id') orgId: string) {
    return this.orgsService.findOne(userId, orgId);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') orgId: string) {
    return this.orgsService.remove(userId, orgId);
  }

  @Post(':id/invite')
  createInvite(@CurrentUser('sub') userId: string, @Param('id') orgId: string) {
    return this.orgsService.createInvite(userId, orgId);
  }

  @Post(':id/invite-email')
  inviteByEmail(
    @CurrentUser('sub') userId: string,
    @Param('id') orgId: string,
    @Body() dto: InviteEmailDto,
  ) {
    return this.orgsService.inviteByEmail(userId, orgId, dto.email);
  }

  @Post('join/:token')
  join(@CurrentUser('sub') userId: string, @Param('token') token: string) {
    return this.orgsService.joinByToken(userId, token);
  }

  @Post('invites/:inviteId/accept')
  acceptInvite(@CurrentUser('sub') userId: string, @Param('inviteId') inviteId: string) {
    return this.orgsService.respondToInvite(userId, inviteId, true);
  }

  @Post('invites/:inviteId/reject')
  rejectInvite(@CurrentUser('sub') userId: string, @Param('inviteId') inviteId: string) {
    return this.orgsService.respondToInvite(userId, inviteId, false);
  }

  @Delete(':id/leave')
  leave(@CurrentUser('sub') userId: string, @Param('id') orgId: string) {
    return this.orgsService.leave(userId, orgId);
  }

  @Delete(':id/members/:memberId')
  kickMember(
    @CurrentUser('sub') userId: string,
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.orgsService.kickMember(userId, orgId, memberId);
  }

  @Patch(':id/members/:memberId/transfer')
  transferLeader(
    @CurrentUser('sub') userId: string,
    @Param('id') orgId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.orgsService.transferLeader(userId, orgId, memberId);
  }
}
