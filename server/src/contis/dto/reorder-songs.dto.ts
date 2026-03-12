import { IsArray, IsString } from 'class-validator';

export class ReorderSongsDto {
  // contiSong ID 목록 - 순서대로 전달
  @IsArray()
  @IsString({ each: true })
  ids!: string[];
}
