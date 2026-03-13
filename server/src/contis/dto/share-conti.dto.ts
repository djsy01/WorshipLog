import { IsUUID } from 'class-validator';

export class ShareContiDto {
  @IsUUID()
  teamId!: string;
}
