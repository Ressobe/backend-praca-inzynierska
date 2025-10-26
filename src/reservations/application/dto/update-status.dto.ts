import { IsEnum } from 'class-validator';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';

export class UpdateStatusDto {
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
