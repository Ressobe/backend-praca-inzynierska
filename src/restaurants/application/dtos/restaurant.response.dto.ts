import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsDefined,
  IsOptional,
  ValidateNested,
} from 'class-validator';

export class OpenHoursDto {
  @ApiProperty({ example: ['12:00', '22:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  monday: [string, string];

  @ApiProperty({ example: ['12:00', '22:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  tuesday: [string, string];

  @ApiProperty({ example: ['12:00', '22:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  wednesday: [string, string];

  @ApiProperty({ example: ['12:00', '22:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  thursday: [string, string];

  @ApiProperty({ example: ['12:00', '22:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  friday: [string, string];

  @ApiProperty({ example: ['10:00', '23:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  saturday: [string, string];

  @ApiProperty({ example: ['10:00', '20:00'], type: [String] })
  @IsDefined()
  @IsString({ each: true })
  sunday: [string, string];
}

export class RestaurantResponseDto {
  @ApiProperty({
    example: '6B29FC40-CA47-1067-B31D-00DD010662DA',
    description: 'Unique identifier of the restaurant',
    format: 'uuid',
  })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'Sushi Zen',
    description: 'Name of the restaurant',
    maxLength: 255,
  })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Krakow',
    description: 'City where the restaurant is located',
    maxLength: 100,
  })
  @IsString()
  city: string;

  @ApiProperty({
    example: 'ul. Dluga 12',
    description: 'Address of the restaurant',
    maxLength: 255,
  })
  @IsString()
  address: string;

  @ApiProperty({
    type: OpenHoursDto,
    description: 'Daily opening hours of the restaurant',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OpenHoursDto)
  openHours?: OpenHoursDto;
}
