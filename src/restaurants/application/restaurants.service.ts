import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Restaurant } from '../domain/restaurant.entity';
import { Repository } from 'typeorm';
import { GetRestaurantsFiltersDto } from './dtos/get-restaurants-filters.dto';
import { IPaginatedResult } from 'src/shared/pagination.dto';

@Injectable()
export class RestaurantsService {
  constructor(
    @InjectRepository(Restaurant)
    private restaurantsRepository: Repository<Restaurant>,
  ) {}

  async findAll(
    filters: GetRestaurantsFiltersDto,
  ): Promise<IPaginatedResult<Restaurant>> {
    const queryBuilder =
      this.restaurantsRepository.createQueryBuilder('restaurant');

    if (filters.search) {
      queryBuilder.andWhere('LOWER(restaurant.name) LIKE LOWER(:search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.city) {
      queryBuilder.andWhere('LOWER(restaurant.city) LIKE LOWER(:city)', {
        city: `%${filters.city}%`,
      });
    }

    // TODO: dodać pole cusisine do modelu
    // if (filters.cuisine) {
    //   queryBuilder.andWhere('LOWER(restaurant.cuisine) LIKE LOWER(:cuisine)', {
    //     cuisine: `%${filters.cuisine}%`,
    //   });
    // }

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    queryBuilder.take(limit).skip(skip);

    const [restaurants, total] = await queryBuilder.getManyAndCount();

    return {
      data: restaurants,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantsRepository.findOne({
      where: { id },
    });

    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID "${id}" not found`);
    }

    return restaurant;
  }
}
