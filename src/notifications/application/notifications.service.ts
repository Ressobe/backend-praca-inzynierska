import { Injectable } from '@nestjs/common';
import { MailerService } from '../infrastructure/mailer.service';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';

@Injectable()
export class NotificationsService {
  constructor(private readonly mailer: MailerService) {}

  async sendReservationCreated(to: string, name: string, cancelUrl: string) {
    await this.mailer.sendMail(
      to,
      'Twoja rezerwacja została złożona',
      'reservation-created',
      {
        name,
        cancelUrl,
      },
    );
  }

  async sendStatusChanged(to: string, name: string, status: ReservationStatus) {
    const statusText =
      status === ReservationStatus.ACCEPTED
        ? 'została zaakceptowana'
        : 'została odrzucona';

    await this.mailer.sendMail(
      to,
      'Aktualizacja rezerwacji',
      'reservation-status-changed',
      {
        name,
        statusText,
      },
    );
  }

  async sendReservationCancelled(to: string, name: string) {
    await this.mailer.sendMail(
      to,
      'Rezerwacja została anulowana',
      'reservation-cancelled',
      {
        name,
      },
    );
  }
}
