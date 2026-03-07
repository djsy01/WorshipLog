import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: this.config.get<string>('GMAIL_USER'),
        pass: this.config.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const clientUrl = this.config.get<string>('CLIENT_URL') ?? 'http://localhost:3001';
    const verifyUrl = `${clientUrl}/verify-email/confirm?token=${token}`;

    await this.transporter.sendMail({
      from: `"WorshipLog" <${this.config.get('GMAIL_USER')}>`,
      to,
      subject: '[WorshipLog] 이메일 인증을 완료해주세요',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">WorshipLog</h2>
          <p>안녕하세요, <strong>${name}</strong>님!</p>
          <p>아래 버튼을 클릭해 이메일 인증을 완료해주세요.</p>
          <p style="color: #6b7280; font-size: 13px;">링크는 24시간 동안 유효합니다.</p>
          <a href="${verifyUrl}"
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 28px;
                    border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            이메일 인증하기
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
          </p>
        </div>
      `,
    });

    this.logger.log(`Verification email sent to ${to}`);
  }
}
