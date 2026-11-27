import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}

export class CreatePostDto extends CreateCommentDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  fileUrl?: string;

  @IsOptional()
  @IsString()
  meditationId?: string;
}
