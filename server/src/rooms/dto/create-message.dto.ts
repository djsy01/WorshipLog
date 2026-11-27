import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  content!: string;

  @IsOptional()
  @IsUrl({
    protocols: ['http', 'https'],
    require_protocol: true,
    require_tld: false,
  })
  fileUrl?: string;
}
