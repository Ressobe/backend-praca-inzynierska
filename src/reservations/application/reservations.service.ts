import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation, ReservationStatus } from '../domain/reservation.entity';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Restaurant } from 'src/restaurants/domain/restaurant.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,

    @InjectRepository(Restaurant)
    private restaurantsRepository: Repository<Restaurant>,
  ) {}

  async create(dto: CreateReservationDto): Promise<Reservation> {
    const restaurant = await this.restaurantsRepository.findOne({
      where: {
        id: dto.restaurantId,
      },
    });
    if (!restaurant) throw new NotFoundException('Restauracja nie istnieje');

    const date = new Date(dto.date);
    const now = new Date();

    if (date < now) {
      throw new BadRequestException('Nie można rezerwować dat z przeszłości');
    }

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    if (date > maxDate) {
      throw new BadRequestException(
        'Można rezerwować maksymalnie 30 dni do przodu',
      );
    }

    const day = date.toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
    const openHours = restaurant.openHours?.[day];

    if (!openHours) {
      throw new BadRequestException('Restauracja jest dziś zamknięta');
    }

    const [open, close] = openHours;
    const reservationTime = date.toTimeString().substring(0, 5);

    if (reservationTime < open || reservationTime > close) {
      throw new BadRequestException(
        `Rezerwacja możliwa tylko między ${open} a ${close}`,
      );
    }

    const minutes = date.getMinutes();
    if (minutes !== 0 && minutes !== 30) {
      throw new BadRequestException('Rezerwacja możliwa tylko co 30 minut');
    }

    const reservation = this.reservationsRepository.create({
      ...dto,
      status: ReservationStatus.PENDING,
      cancelToken: randomUUID(),
    });

    return this.reservationsRepository.save(reservation);
  }

  async findStatus(id: string): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException('Rezerwacja nie istnieje');
    }
    return reservation;
  }

  async cancelByToken(token: string): Promise<{ message: string }> {
    const reservation = await this.reservationsRepository.findOne({
      where: { cancelToken: token },
    });
    if (!reservation) {
      throw new NotFoundException('Nie znaleziono rezerwacji');
    }

    reservation.status = ReservationStatus.CANCELLED;
    await this.reservationsRepository.save(reservation);

    return { message: 'Rezerwacja została anulowana.' };
  }

  async updateStatus(id: string, dto: UpdateStatusDto): Promise<Reservation> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id },
    });
    if (!reservation) {
      throw new NotFoundException('Rezerwacja nie istnieje');
    }

    reservation.status = dto.status;
    return this.reservationsRepository.save(reservation);
  }
}
