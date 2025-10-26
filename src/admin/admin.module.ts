import { Module } from '@nestjs/common';
import { AdminService } from './application/admin.service';
import { AdminController } from './application/admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reservation } from 'src/reservations/domain/reservation.entity';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation]),
    NotificationsModule,
    AuthModule,
  ],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
