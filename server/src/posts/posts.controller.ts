import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateCommentDto, CreatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  list(
    @CurrentUser('sub') userId: string | undefined,
    @Query('category') category?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.postsService.list(userId, category, cursor);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@CurrentUser('sub') userId: string, @Body() dto: CreatePostDto) {
    return this.postsService.create(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@CurrentUser('sub') userId: string, @Param('id') postId: string) {
    return this.postsService.remove(userId, postId);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id/comments')
  getComments(
    @CurrentUser('sub') userId: string | undefined,
    @Param('id') postId: string,
  ) {
    return this.postsService.getComments(userId, postId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comments')
  createComment(
    @CurrentUser('sub') userId: string,
    @Param('id') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(userId, postId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/comments/:commentId')
  removeComment(
    @CurrentUser('sub') userId: string,
    @Param('id') postId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.postsService.removeComment(userId, postId, commentId);
  }
}
