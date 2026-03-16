import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @Get()
  list(@CurrentUser('sub') userId: string, @Query('cursor') cursor?: string) {
    return this.postsService.list(userId, cursor);
  }

  @Post()
  create(
    @CurrentUser('sub') userId: string,
    @Body() dto: { content: string; isAnonymous?: boolean; meditationId?: string },
  ) {
    return this.postsService.create(userId, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') postId: string) {
    return this.postsService.remove(userId, postId);
  }

  @Get(':id/comments')
  getComments(@CurrentUser('sub') userId: string, @Param('id') postId: string) {
    return this.postsService.getComments(userId, postId);
  }

  @Post(':id/comments')
  createComment(
    @CurrentUser('sub') userId: string,
    @Param('id') postId: string,
    @Body() dto: { content: string; isAnonymous?: boolean },
  ) {
    return this.postsService.createComment(userId, postId, dto);
  }

  @Delete(':id/comments/:commentId')
  removeComment(
    @CurrentUser('sub') userId: string,
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.removeComment(userId, postId, commentId);
  }
}
