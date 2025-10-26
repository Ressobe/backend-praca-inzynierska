import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ReservationResponseDto } from '../../admin/application/dtos/reservation.response.dto'; // Reużywamy DTO z admin

@ApiTags('Reservations')
@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiBody({ type: CreateReservationDto })
  @ApiResponse({
    status: 201,
    description: 'The reservation has been successfully created.',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request (e.g., invalid date, time, or restaurant closed).',
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurant not found.',
  })
  async create(@Body() dto: CreateReservationDto) {
    return this.reservationsService.create(dto);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Get the status of a specific reservation' })
  @ApiParam({ name: 'id', description: 'ID of the reservation', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation status retrieved successfully.',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found.',
  })
  async getStatus(@Param('id') id: string) {
    return this.reservationsService.findStatus(id);
  }

  @Delete('cancel')
  @ApiOperation({ summary: 'Cancel a reservation using a unique token' })
  @ApiQuery({ name: 'token', description: 'Cancellation token', type: String })
  @ApiResponse({
    status: 200,
    description: 'Reservation cancelled successfully.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Rezerwacja została anulowana.' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Cancellation token not found.',
  })
  async cancel(@Query('token') token: string) {
    return this.reservationsService.cancelByToken(token);
  }

  @Put(':id/status')
  @ApiOperation({
    summary: 'Update the status of a specific reservation by user',
  })
  @ApiParam({ name: 'id', description: 'ID of the reservation', type: String })
  @ApiBody({ type: UpdateStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Reservation status updated successfully.',
    type: ReservationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Reservation not found.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request (e.g., invalid status).',
  })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.reservationsService.updateStatus(id, dto);
  }
}
