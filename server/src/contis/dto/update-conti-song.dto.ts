import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateContiSongDto {
  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  tempo?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
