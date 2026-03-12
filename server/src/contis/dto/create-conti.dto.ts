import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateContiDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  worshipDate?: string;
}
