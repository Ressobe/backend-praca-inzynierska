import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationsService } from './application/reservations.service';
import { ReservationsController } from './application/reservations.controller';
import { Reservation } from './domain/reservation.entity';
import { Restaurant } from 'src/restaurants/domain/restaurant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Reservation, Restaurant])],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}
