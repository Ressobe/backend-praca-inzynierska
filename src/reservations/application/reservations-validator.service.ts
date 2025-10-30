import { BadRequestException, Injectable } from '@nestjs/common';
import { Restaurant } from 'src/restaurants/domain/restaurant.entity';

@Injectable()
export class ReservationsValidatorService {
  validateDate(date: Date): void {
    const reservationDateOnly = new Date(date);
    reservationDateOnly.setUTCHours(0, 0, 0, 0);

    const now = new Date();
    const nowOnlyDate = new Date(now);
    nowOnlyDate.setUTCHours(0, 0, 0, 0);

    if (reservationDateOnly < nowOnlyDate) {
      throw new BadRequestException('Nie można rezerwować dat z przeszłości');
    }

    const maxDate = new Date(now);
    maxDate.setUTCDate(maxDate.getUTCDate() + 30);
    maxDate.setUTCHours(0, 0, 0, 0);

    if (reservationDateOnly > maxDate) {
      throw new BadRequestException(
        'Można rezerwować maksymalnie 30 dni do przodu',
      );
    }
  }

  validateOpeningHours(date: Date, openHours: Restaurant['openHours']): void {
    const daysOfWeek = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ];

    const day = daysOfWeek[date.getUTCDay()];
    const openHoursForDay = openHours?.[day];

    if (!openHoursForDay) {
      throw new BadRequestException('Restauracja jest dziś zamknięta');
    }

    const [open, close] = openHoursForDay;
    const reservationTime = `${String(date.getUTCHours()).padStart(2, '0')}:${String(
      date.getUTCMinutes(),
    ).padStart(2, '0')}`; // Format HH:MM

    if (reservationTime < open || reservationTime > close) {
      throw new BadRequestException(
        `Rezerwacja możliwa tylko między ${open} a ${close}`,
      );
    }
  }

  validateReservationInterval(date: Date): void {
    const minutes = date.getUTCMinutes();
    if (minutes !== 0 && minutes !== 30) {
      throw new BadRequestException('Rezerwacja możliwa tylko co 30 minut');
    }
  }
}
