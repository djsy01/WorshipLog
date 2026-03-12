import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateHistoryDto {
  @IsOptional()
  @IsString()
  contiId?: string;

  @IsOptional()
  @IsDateString()
  worshipDate?: string;
}
