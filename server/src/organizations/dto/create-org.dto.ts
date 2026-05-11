import { IsOptional, IsString } from 'class-validator';

export class CreateOrgDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
