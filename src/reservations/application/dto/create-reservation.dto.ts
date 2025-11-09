import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({
    description: 'Imię i nazwisko rezerwującego',
    example: 'Jan Kowalski',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Adres e-mail rezerwującego',
    example: 'jan.kowalski@example.com',
    format: 'email',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Liczba gości',
    example: 4,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  peopleCount: number;

  @ApiProperty({
    description: 'Data rezerwacji (YYYY-MM-DD)',
    example: '2025-10-26',
    format: 'date',
  })
  @IsNotEmpty()
  @IsString()
  date: string;

  @ApiProperty({
    description: 'Godzina rezerwacji (HH:MM)',
    example: '18:00',
    type: String,
  })
  @IsNotEmpty()
  @IsString()
  time: string;

  @ApiProperty({
    description: 'ID restauracji, do której składana jest rezerwacja',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    format: 'uuid',
  })
  @IsUUID()
  restaurantId: string;
}
