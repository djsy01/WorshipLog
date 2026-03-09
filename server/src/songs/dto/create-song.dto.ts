import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSongDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  artist?: string;

  @IsOptional()
  @IsString()
  defaultKey?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tempo?: number;

  @IsOptional()
  @IsString()
  lyrics?: string;

  @IsOptional()
  @IsString()
  scriptureRef?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
