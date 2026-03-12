import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateContiDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  worshipDate?: string;
}
