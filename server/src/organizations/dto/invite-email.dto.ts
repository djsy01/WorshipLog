import { IsEmail } from 'class-validator';

export class InviteEmailDto {
  @IsEmail({}, { message: '유효한 이메일 주소를 입력하세요.' })
  email: string;
}
