import { IsUUID } from 'class-validator';

export class ShareContiDto {
  @IsUUID()
  roomId!: string;
}
