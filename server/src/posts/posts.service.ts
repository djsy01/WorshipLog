import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  private formatAuthor(userId: string, name: string, isAnonymous: boolean, requesterId: string) {
    if (!isAnonymous || userId === requesterId) return name;
    return '익명';
  }

  async list(requesterId: string, cursor?: string, take = 20) {
    const posts = await this.prisma.post.findMany({
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        meditation: { select: { book: true, chapter: true, verse: true, content: true } },
        _count: { select: { comments: true } },
      },
    });

    return posts.map((p) => ({
      ...p,
      author: this.formatAuthor(p.userId, p.user.name, p.isAnonymous, requesterId),
      isMine: p.userId === requesterId,
      user: undefined,
    }));
  }

  async create(userId: string, dto: { content: string; isAnonymous?: boolean; meditationId?: string }) {
    const post = await this.prisma.post.create({
      data: {
        userId,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? true,
        meditationId: dto.meditationId ?? null,
      },
      include: {
        user: { select: { id: true, name: true } },
        meditation: { select: { book: true, chapter: true, verse: true, content: true } },
        _count: { select: { comments: true } },
      },
    });

    return {
      ...post,
      author: this.formatAuthor(post.userId, post.user.name, post.isAnonymous, userId),
      isMine: true,
      user: undefined,
    };
  }

  async remove(userId: string, postId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (post.userId !== userId) throw new ForbiddenException('작성자만 삭제할 수 있습니다.');
    await this.prisma.post.delete({ where: { id: postId } });
    return { message: '삭제되었습니다.' };
  }

  async getComments(requesterId: string, postId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { postId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, name: true } } },
    });

    return comments.map((c) => ({
      ...c,
      author: this.formatAuthor(c.userId, c.user.name, c.isAnonymous, requesterId),
      isMine: c.userId === requesterId,
      user: undefined,
    }));
  }

  async createComment(
    userId: string,
    postId: string,
    dto: { content: string; isAnonymous?: boolean },
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('게시글을 찾을 수 없습니다.');

    const comment = await this.prisma.comment.create({
      data: {
        userId,
        postId,
        content: dto.content,
        isAnonymous: dto.isAnonymous ?? true,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return {
      ...comment,
      author: this.formatAuthor(comment.userId, comment.user.name, comment.isAnonymous, userId),
      isMine: true,
      user: undefined,
    };
  }

  async removeComment(userId: string, postId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('댓글을 찾을 수 없습니다.');
    if (comment.postId !== postId) throw new NotFoundException('게시글을 찾을 수 없습니다.');
    if (comment.userId !== userId) throw new ForbiddenException('작성자만 삭제할 수 있습니다.');
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { message: '삭제되었습니다.' };
  }
}
