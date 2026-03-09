import { Injectable } from '@nestjs/common';
import * as path from 'path';

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
  getRandomVerse(): BibleVerse {
    const index = Math.floor(Math.random() * verses.length);
    return verses[index];
  }

  getVerseOfDay(): BibleVerse {
    const dayOfYear = this.getDayOfYear();
    const index = dayOfYear % verses.length;
    return verses[index];
  }

  private getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
