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
import { ReservationsValidatorService } from './reservations-validator.service';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,

    @InjectRepository(Restaurant)
    private restaurantsRepository: Repository<Restaurant>,
    private reservationsValidatorService: ReservationsValidatorService,
  ) {}

  async create(dto: CreateReservationDto): Promise<Reservation> {
    const restaurant = await this.restaurantsRepository.findOne({
      where: {
        id: dto.restaurantId,
      },
    });
    if (!restaurant) throw new NotFoundException('Restauracja nie istnieje');

    const date = new Date(dto.date);

    this.reservationsValidatorService.validateDate(date);
    this.reservationsValidatorService.validateOpeningHours(
      date,
      restaurant.openHours,
    );
    this.reservationsValidatorService.validateReservationInterval(date);

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

    if (reservation.status === ReservationStatus.CANCELLED) {
      throw new BadRequestException(
        'Nie można zmienić statusu anulowanej rezerwacji',
      );
    }

    reservation.status = dto.status;
    return this.reservationsRepository.save(reservation);
  }
}
