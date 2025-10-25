import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { PaginationQueryDto } from 'src/shared/pagination.dto';

export class GetRestaurantsFiltersDto extends PaginationQueryDto {
  @ApiProperty({
    description: 'Search term for restaurant name',
    required: false,
    example: 'Pizza',
  })
  @IsOptional()
  @IsString({ message: 'Search term must be a string' })
  @IsNotEmpty({ message: 'Search term cannot be empty' })
  search?: string;

  @ApiProperty({
    description: 'Filter by city',
    required: false,
    example: 'Krakow',
  })
  @IsOptional()
  @IsString({ message: 'City must be a string' })
  @IsNotEmpty({ message: 'City cannot be empty' })
  city?: string;

  // TODO: dodać cuisine do restaurant entity
  // @ApiProperty({
  //   description: 'Filter by cuisine type',
  //   required: false,
  //   example: 'Italian',
  // })
  // @IsOptional()
  // @IsString({ message: 'Cuisine must be a string' })
  // @IsNotEmpty({ message: 'Cuisine cannot be empty' })
  // cuisine?: string;
}
