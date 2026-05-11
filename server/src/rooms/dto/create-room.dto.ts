import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateRoomDto {
  @IsUUID()
  orgId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
