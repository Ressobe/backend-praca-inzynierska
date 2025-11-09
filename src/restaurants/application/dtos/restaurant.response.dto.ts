import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsUUID,
  IsDefined,
  IsOptional,
  ValidateNested,
  IsNumber,
  Min,
  Max,
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

  @ApiProperty({
    example: 4.5,
    description: 'Rating of the restaurant (0.0 to 5.0)',
    type: Number,
    minimum: 0,
    maximum: 5,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 'https://example.com/images/sushi_zen.jpg',
    description: 'URL to the restaurant image',
    required: false,
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    example: 'Sushi',
    description: 'Cuisine type of the restaurant',
    required: false,
  })
  @IsOptional()
  @IsString()
  cuisine?: string;

  constructor(data: Partial<RestaurantResponseDto> = {}) {
    Object.assign(this, data);
  }
}
