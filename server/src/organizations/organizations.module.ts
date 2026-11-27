import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationInvitesService } from './organization-invites.service';
import { OrganizationsService } from './organizations.service';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [MailModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, OrganizationInvitesService],
})
export class OrganizationsModule {}
