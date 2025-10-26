import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NotificationsService } from 'src/notifications/application/notifications.service';
import {
  Reservation,
  ReservationStatus,
} from 'src/reservations/domain/reservation.entity';
import { Repository } from 'typeorm';
import { GetReservationsFiltersDto } from './dtos/get-reservations-filters.dto';
import { IPaginatedResult } from 'src/shared/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(
    restaurantId: string,
    filters: GetReservationsFiltersDto,
  ): Promise<IPaginatedResult<Reservation>> {
    const query = this.reservationRepo
      .createQueryBuilder('r')
      .where('r.restaurantId = :restaurantId', { restaurantId })
      .orderBy('r.date', 'ASC');

    if (filters.status)
      query.andWhere('r.status = :status', { status: filters.status });
    if (filters.date)
      query.andWhere('DATE(r.date) = DATE(:date)', { date: filters.date });

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    query.take(limit).skip(skip);

    const [reservations, total] = await query.getManyAndCount();

    return {
      data: reservations,
      total,
      page,
      limit,
    };
  }

  async updateStatus(
    id: string,
    restaurantId: string,
    newStatus: ReservationStatus,
  ): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id, restaurantId },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    reservation.status = newStatus;
    await this.reservationRepo.save(reservation);

    await this.notifications.sendStatusChanged(
      reservation.email,
      reservation.name,
      newStatus,
    );

    return reservation;
  }
}
