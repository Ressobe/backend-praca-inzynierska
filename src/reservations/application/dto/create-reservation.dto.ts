import {
  IsDate,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(1)
  @Max(10)
  peopleCount: number;

  @IsDate()
  date: string;

  @IsUUID()
  restaurantId: string;
}
