import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(private roomsService: RoomsService) {}

  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreateRoomDto) {
    return this.roomsService.create(userId, dto);
  }

  @Get()
  findByOrg(@CurrentUser('sub') userId: string, @Query('orgId') orgId: string) {
    return this.roomsService.findByOrg(userId, orgId);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') roomId: string) {
    return this.roomsService.remove(userId, roomId);
  }

  @Get(':id/messages')
  getMessages(@CurrentUser('sub') userId: string, @Param('id') roomId: string) {
    return this.roomsService.getMessages(userId, roomId);
  }

  @Post(':id/messages')
  createMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
    @Body() dto: { content: string; fileUrl?: string },
  ) {
    return this.roomsService.createMessage(userId, roomId, dto);
  }

  @Delete(':id/messages/:messageId')
  deleteMessage(
    @CurrentUser('sub') userId: string,
    @Param('id') roomId: string,
    @Param('messageId') messageId: string,
  ) {
    return this.roomsService.deleteMessage(userId, roomId, messageId);
  }

  @Get(':id/contis')
  getContis(@CurrentUser('sub') userId: string, @Param('id') roomId: string) {
    return this.roomsService.getContis(userId, roomId);
  }
}
