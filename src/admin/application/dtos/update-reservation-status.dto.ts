import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';

export class UpdateReservationStatusDto {
  @ApiProperty({
    enum: ReservationStatus,
    example: ReservationStatus.ACCEPTED,
    description: 'New status for the reservation',
  })
  @IsEnum(ReservationStatus)
  @IsNotEmpty()
  status: ReservationStatus;
}
