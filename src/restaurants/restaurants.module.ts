import { Module } from '@nestjs/common';
import { RestaurantsController } from './application/restaurants.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './domain/restaurant.entity';
import { RestaurantsService } from './application/restaurants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Restaurant])],
  providers: [RestaurantsService],
  controllers: [RestaurantsController],
})
export class RestaurantsModule {}
