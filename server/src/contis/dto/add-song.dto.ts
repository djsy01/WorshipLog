import { IsOptional, IsString } from 'class-validator';

export class AddSongDto {
  @IsString()
  songId!: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
