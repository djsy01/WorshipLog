import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

const htmlEntities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => htmlEntities[character]);
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  async sendTeamInviteEmail(to: string, inviterName: string, teamName: string) {
    const clientUrl =
      this.config.get<string>('CLIENT_URL')?.split(',')[0].trim() ||
      'http://localhost:3001';
    const teamUrl = `${clientUrl}/dashboard/team`;

    const { error } = await this.resend.emails.send({
      from: 'WorshipLog <noreply@inho.pe.kr>',
      to,
      subject: `[WorshipLog] ${inviterName}님이 "${teamName}" 팀에 초대했습니다`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">WorshipLog</h2>
          <p><strong>${escapeHtml(inviterName)}</strong>님이 <strong>${escapeHtml(teamName)}</strong> 팀에 초대했습니다.</p>
          <p style="color: #6b7280; font-size: 13px;">아래 버튼을 클릭해 초대를 확인하세요. 초대는 7일간 유효합니다.</p>
          <a href="${escapeHtml(teamUrl)}"
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 28px;
                    border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            초대 확인하기
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
            본인이 요청하지 않은 경우 이 이메일을 무시해주세요.
          </p>
        </div>
      `,
    });

    if (error) this.logger.warn('팀 초대 이메일을 발송하지 못했습니다.');
  }

  async sendVerificationEmail(to: string, name: string, token: string) {
    const clientUrl =
      this.config.get<string>('CLIENT_URL')?.split(',')[0].trim() ||
      'http://localhost:3001';
    const verifyUrl = `${clientUrl}/verify-email/confirm?token=${token}`;

    const { error } = await this.resend.emails.send({
      from: 'WorshipLog <noreply@inho.pe.kr>',
      to,
      subject: '[WorshipLog] 이메일 인증을 완료해주세요',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #7c3aed; margin-bottom: 8px;">WorshipLog</h2>
          <p>안녕하세요, <strong>${escapeHtml(name)}</strong>님!</p>
          <p>아래 버튼을 클릭해 이메일 인증을 완료해주세요.</p>
          <p style="color: #6b7280; font-size: 13px;">링크는 24시간 동안 유효합니다.</p>
          <a href="${escapeHtml(verifyUrl)}"
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

    if (error) {
      this.logger.warn('인증 이메일을 발송하지 못했습니다.');
      throw new Error('인증 이메일을 발송하지 못했습니다.');
    }
  }
}
