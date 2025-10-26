import { Controller, Get, Param, Query } from '@nestjs/common';
import { RestaurantsService } from './restaurants.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  OpenHoursDto,
  RestaurantResponseDto,
} from './dtos/restaurant.response.dto';
import { plainToInstance } from 'class-transformer';
import { GetRestaurantsFiltersDto } from './dtos/get-restaurants-filters.dto';
import { PaginatedResponseDto } from '../../shared/pagination.dto';

@ApiTags('Restaurants')
@Controller('restaurants')
export class RestaurantsController {
  constructor(private readonly restaurantsService: RestaurantsService) {}

  @Get()
  @ApiOperation({ summary: 'Get a list of restaurants' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved list of restaurants.',
    type: PaginatedResponseDto(RestaurantResponseDto),
  })
  async getRestaurants(@Query() filters: GetRestaurantsFiltersDto) {
    const paginatedResult = await this.restaurantsService.findAll(filters);

    const mappedRestaurants = paginatedResult.data.map((restaurant) => {
      const mappedOpenHours = restaurant.openHours
        ? plainToInstance(OpenHoursDto, restaurant.openHours)
        : undefined;

      return {
        id: restaurant.id,
        name: restaurant.name,
        city: restaurant.city,
        address: restaurant.address,
        openHours: mappedOpenHours,
      };
    });

    return {
      data: mappedRestaurants,
      total: paginatedResult.total,
      page: paginatedResult.page,
      limit: paginatedResult.limit,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single restaurant by ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved restaurant.',
    type: RestaurantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Restaurant not found.',
  })
  async getRestaurantById(@Param('id') id: string) {
    const restaurant = await this.restaurantsService.findOne(id);

    const mappedOpenHours = restaurant.openHours
      ? plainToInstance(OpenHoursDto, restaurant.openHours)
      : undefined;

    return {
      id: restaurant.id,
      name: restaurant.name,
      city: restaurant.city,
      address: restaurant.address,
      openHours: mappedOpenHours,
    };
  }
}
