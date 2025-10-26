import { Module } from '@nestjs/common';
import { ReservationsModule } from './reservations/reservations.module';
import { RestaurantsModule } from './restaurants/restaurants.module';
import { AdminModule } from './admin/admin.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DATA_SOURCE_OPTIONS } from './database/database.providers';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),

    CqrsModule.forRoot(),

    EventEmitterModule.forRoot(),

    DatabaseModule,

    TypeOrmModule.forRootAsync({
      imports: [DatabaseModule],
      inject: [DATA_SOURCE_OPTIONS],
      useFactory: (typeOrmConfig: TypeOrmModuleOptions) => {
        return typeOrmConfig;
      },
    }),

    ReservationsModule,
    RestaurantsModule,
    AdminModule,
    AuthModule,
    NotificationsModule,
    UsersModule,
  ],
})
export class AppModule {}
