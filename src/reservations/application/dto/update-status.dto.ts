import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';

export class UpdateStatusDto {
  @ApiProperty()
  @IsEnum(ReservationStatus)
  status: ReservationStatus;
}
