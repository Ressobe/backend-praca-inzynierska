import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';
import { PaginationQueryDto } from 'src/shared/pagination.dto';

export class GetReservationsFiltersDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ReservationStatus,
    description: 'Filter by reservation status',
  })
  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional({
    type: String,
    format: 'date',
    description: 'Filter by reservation date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
