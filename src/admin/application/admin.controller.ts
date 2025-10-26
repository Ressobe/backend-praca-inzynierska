import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from 'src/auth/infrastructure/auth.guard';
import { ReservationStatus } from 'src/reservations/domain/reservation.entity';
import type { AuthenticatedRequest } from 'src/auth/types/authenticated-request';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginatedResponseDto } from 'src/shared/pagination.dto';
import { ReservationResponseDto } from './dtos/reservation.response.dto';
import { GetReservationsFiltersDto } from './dtos/get-reservations-filters.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateReservationStatusDto } from './dtos/update-reservation-status.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('reservations')
  @ApiOperation({
    summary: 'Get a list of reservations for the authenticated restaurant',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved a paginated list of reservations.',
    type: PaginatedResponseDto(ReservationResponseDto),
  })
  @ApiQuery({
    name: 'status',
    enum: ReservationStatus,
    required: false,
    description: 'Filter reservations by status',
  })
  @ApiQuery({
    name: 'date',
    type: String,
    format: 'date',
    required: false,
    description: 'Filter reservations by date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Items per page',
    example: 10,
  })
  async getReservations(
    @Request() req: AuthenticatedRequest,
    @Query() filters: GetReservationsFiltersDto,
  ) {
    const restaurantId = req.user.restaurantId;
    const paginatedResult = await this.adminService.findAll(
      restaurantId,
      filters,
    );

    const mappedReservations = paginatedResult.data.map((reservation) =>
      plainToInstance(ReservationResponseDto, reservation),
    );

    return {
      data: mappedReservations,
      total: paginatedResult.total,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
    };
  }

  @Put('reservations/:id/status')
  @ApiOperation({ summary: 'Update the status of a specific reservation' })
  @ApiResponse({
    status: 200,
    description: 'Reservation status updated successfully.',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found.',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateReservationStatusDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const restaurantId = req.user.restaurantId;
    const updatedReservation = await this.adminService.updateStatus(
      id,
      restaurantId,
      updateStatusDto.status,
    );
    return plainToInstance(ReservationResponseDto, updatedReservation);
  }
}
