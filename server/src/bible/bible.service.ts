import { Injectable } from '@nestjs/common';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  content: string;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const verses: BibleVerse[] = require(
  path.join(__dirname, '../common/data/bible.json'),
) as BibleVerse[];

@Injectable()
export class BibleService {
  constructor(private prisma: PrismaService) {}

  getRandomVerse(): BibleVerse {
    const index = Math.floor(Math.random() * verses.length);
    return verses[index];
  }

  async getVerseOfDay(userId: string): Promise<BibleVerse & { meditationId: string }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const existing = await this.prisma.meditation.findFirst({
      where: { userId, createdAt: { gte: todayStart } },
    });

    if (existing) {
      return {
        book: existing.book,
        chapter: existing.chapter,
        verse: existing.verse,
        content: existing.content,
        meditationId: existing.id,
      };
    }

    const v = this.getRandomVerse();
    const meditation = await this.prisma.meditation.create({
      data: { userId, book: v.book, chapter: v.chapter, verse: v.verse, content: v.content },
    });
    return { ...v, meditationId: meditation.id };
  }

  async getMeditations(userId: string) {
    return this.prisma.meditation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateNote(userId: string, meditationId: string, note: string) {
    return this.prisma.meditation.updateMany({
      where: { id: meditationId, userId },
      data: { note },
    });
  }

  // "엡 2:21-22" 또는 "엡 2:21" 형태로 구절 조회
  // 여러 구절은 쉼표로 구분 가능: "시 23:1, 빌 4:13"
  searchByRef(ref: string): BibleVerse[] {
    const results: BibleVerse[] = [];
    const parts = ref.split(',').map((p) => p.trim()).filter(Boolean);

    for (const part of parts) {
      const match = part.match(/^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/);
      if (!match) continue;

      const book = match[1].trim();
      const chapter = parseInt(match[2]);
      const verseStart = match[3] ? parseInt(match[3]) : undefined;
      const verseEnd = match[4] ? parseInt(match[4]) : verseStart;

      const found = verses.filter((v) => {
        if (v.book !== book || v.chapter !== chapter) return false;
        if (verseStart === undefined) return true;
        return v.verse >= verseStart && v.verse <= (verseEnd ?? verseStart);
      });
      results.push(...found);
    }
    return results;
  }
}
