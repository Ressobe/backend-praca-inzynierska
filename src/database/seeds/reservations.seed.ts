import { Logger } from '@nestjs/common';
import {
  Reservation,
  ReservationStatus,
} from 'src/reservations/domain/reservation.entity';
import { Restaurant } from 'src/restaurants/domain/restaurant.entity';
import { DataSource } from 'typeorm';

export const seedReservations = async (
  dataSource: DataSource,
  logger: Logger,
) => {
  const reservationRepo = dataSource.getRepository(Reservation);
  const restaurantRepo = dataSource.getRepository(Restaurant);

  const restaurants = await restaurantRepo.find();

  if (restaurants.length === 0) {
    logger.warn(
      'No restaurants found to seed reservations for. Please seed restaurants first.',
    );
    return;
  }

  const allReservations: Partial<Reservation>[] = [];
  const numberOfReservationsPerRestaurant = 25;
  const possibleTimes = [
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
    '20:30',
    '21:00',
    '21:30',
    '22:00',
  ];
  const possibleStatuses = [
    ReservationStatus.PENDING,
    ReservationStatus.ACCEPTED,
    ReservationStatus.REJECTED,
  ];

  for (const restaurant of restaurants) {
    for (let i = 0; i < numberOfReservationsPerRestaurant; i++) {
      const now = new Date();
      const randomDaysOffset = Math.floor(Math.random() * 7);
      const reservationDate = new Date(
        now.getTime() + randomDaysOffset * 24 * 60 * 60 * 1000,
      );

      const randomPeopleCount = Math.floor(Math.random() * 7) + 2;
      const randomTime =
        possibleTimes[Math.floor(Math.random() * possibleTimes.length)];
      const randomStatus =
        possibleStatuses[Math.floor(Math.random() * possibleStatuses.length)];

      allReservations.push({
        name: `Jan Kowalski ${restaurant.name.substring(0, 5)} R${i + 1}`,
        email: `jan.kowalski.${restaurant.id.substring(0, 4)}.${i + 1}@example.com`,
        peopleCount: randomPeopleCount,
        date: reservationDate,
        time: randomTime,
        status: randomStatus,
        restaurantId: restaurant.id,
      });
    }
    logger.log(
      `Generated ${numberOfReservationsPerRestaurant} reservations for restaurant: ${restaurant.name}`,
    );
  }

  await reservationRepo.save(allReservations);
  logger.log(`✅ Seeded a total of ${allReservations.length} reservations.`);
};
