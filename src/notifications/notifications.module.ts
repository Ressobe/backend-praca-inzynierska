import { Module } from '@nestjs/common';
import { NotificationsService } from './application/notifications.service';
import { MailerService } from './infrastructure/mailer.service';

@Module({
  providers: [NotificationsService, MailerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
