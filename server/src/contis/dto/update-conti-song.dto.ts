import { IsOptional, IsString } from 'class-validator';

export class UpdateContiSongDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
