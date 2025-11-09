import { ApiProperty } from '@nestjs/swagger';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';

export class ReservationResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef' })
  id: string;

  @ApiProperty({ example: 'Jan Kowalski' })
  name: string;

  @ApiProperty({ example: 'jan.kowalski@example.com' })
  email: string;

  @ApiProperty({ example: '2025-10-26T18:00:00.000Z' })
  date: Date;

  @ApiProperty({ example: '18:00' })
  time: string;

  @ApiProperty({ example: 4 })
  peopleCount: number;

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.PENDING })
  status: ReservationStatus;

  @ApiProperty({ example: 'restaurant-uuid-123' })
  restaurantId: string;
}
