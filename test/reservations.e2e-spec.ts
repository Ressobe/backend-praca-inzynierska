import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import {
  Reservation,
  ReservationStatus,
} from '../src/reservations/domain/reservation.entity';
import { Restaurant } from '../src/restaurants/domain/restaurant.entity';
import { CreateReservationDto } from '../src/reservations/application/dto/create-reservation.dto';
import { randomUUID } from 'crypto';
import { ReservationsModule } from '../src/reservations/reservations.module';
import { ReservationsService } from '../src/reservations/application/reservations.service';
import { NotificationsService } from '../src/notifications/application/notifications.service';
import { DataSource } from 'typeorm';
import { ConfigModule } from '@nestjs/config';

describe('ReservationsController (Integration - Mocked Repositories)', () => {
  let app: INestApplication;
  let reservationRepository: Repository<Reservation>;
  let restaurantRepository: Repository<Restaurant>;
  let reservationsService: ReservationsService;
  let notificationsService: NotificationsService;
  let dataSource: DataSource;

  const MOCKED_DATE = new Date('2025-01-15T12:00:00.000Z');

  const mockReservationRepository = {
    create: jest.fn().mockImplementation((dto) => dto),
    save: jest
      .fn()
      .mockImplementation((reservation) =>
        Promise.resolve({ id: randomUUID(), ...reservation }),
      ),
    findOne: jest.fn(),
  };

  const mockRestaurantRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationsService = {
    sendReservationCreated: jest.fn().mockResolvedValue(undefined),
    sendReservationCancelled: jest.fn().mockResolvedValue(undefined),
    sendReservationStatusUpdated: jest.fn().mockResolvedValue(undefined),
  };

  // Mock for QueryRunner
  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn().mockImplementation((_entity, dto) => dto), // Mock create for EntityManager
      save: jest
        .fn()
        .mockImplementation((entity, reservation) =>
          Promise.resolve({ id: randomUUID(), ...reservation }),
        ),
    },
  };

  // Mock for DataSource
  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockReservationRepository.create.mockClear();
    mockReservationRepository.save.mockClear();
    mockReservationRepository.findOne.mockClear();
    mockRestaurantRepository.findOne.mockClear();
    mockNotificationsService.sendReservationCreated.mockClear();
    mockNotificationsService.sendReservationCancelled.mockClear();
    mockNotificationsService.sendReservationStatusUpdated.mockClear();
    mockDataSource.createQueryRunner.mockClear();
    mockQueryRunner.connect.mockClear();
    mockQueryRunner.startTransaction.mockClear();
    mockQueryRunner.commitTransaction.mockClear();
    mockQueryRunner.rollbackTransaction.mockClear();
    mockQueryRunner.release.mockClear();
    mockQueryRunner.manager.create.mockClear();
    mockQueryRunner.manager.save.mockClear();

    // Włącz fałszywe timery
    jest.useFakeTimers();
    jest.setSystemTime(MOCKED_DATE);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Reservation, Restaurant],
          synchronize: false,
          autoLoadEntities: true,
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        ReservationsModule,
      ],
    })
      .overrideProvider(getRepositoryToken(Reservation))
      .useValue(mockReservationRepository)
      .overrideProvider(getRepositoryToken(Restaurant))
      .useValue(mockRestaurantRepository)
      .overrideProvider(NotificationsService)
      .useValue(mockNotificationsService)
      .overrideProvider(DataSource)
      .useValue(mockDataSource)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    reservationsService =
      moduleFixture.get<ReservationsService>(ReservationsService);
    reservationRepository = moduleFixture.get<Repository<Reservation>>(
      getRepositoryToken(Reservation),
    );
    restaurantRepository = moduleFixture.get<Repository<Restaurant>>(
      getRepositoryToken(Restaurant),
    );
    notificationsService =
      moduleFixture.get<NotificationsService>(NotificationsService);
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterEach(async () => {
    jest.useRealTimers();
    await app.close();
  });

  // Test case 1: Successful reservation creation
  it('should create a reservation successfully', async () => {
    const restaurantId = randomUUID();
    const futureDate = new Date(MOCKED_DATE.getTime() + 24 * 60 * 60 * 1000); // 1 dzień po MOCKED_DATE
    futureDate.setUTCHours(12, 0, 0, 0); // Ustaw na 12:00 UTC, żeby pasowało do otwartych godzin

    const createReservationDto: CreateReservationDto = {
      restaurantId,
      date: futureDate.toISOString().split('T')[0],
      time: '12:00',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    // Mockujemy, że restauracja istnieje i ma otwarte w danym czasie
    mockRestaurantRepository.findOne.mockResolvedValueOnce({
      id: restaurantId,
      name: 'Test Restaurant',
      city: 'Test City',
      address: 'Test Address 123',
      openHours: {
        monday: ['10:00', '22:00'],
        tuesday: ['10:00', '22:00'],
        wednesday: ['10:00', '22:00'],
        thursday: ['10:00', '22:00'],
        friday: ['10:00', '22:00'],
        saturday: ['10:00', '22:00'],
        sunday: ['10:00', '22:00'],
      },
    });

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(201); // Oczekujemy statusu 201 Created

    expect(response.body).toHaveProperty('id');
    expect(response.body.status).toEqual(ReservationStatus.PENDING);
    expect(response.body.email).toEqual(createReservationDto.email);
    // These expectations now check the queryRunner.manager.create/save
    expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
      Reservation,
      expect.objectContaining({
        ...createReservationDto,
        status: ReservationStatus.PENDING,
      }),
    );
    expect(mockQueryRunner.manager.save).toHaveBeenCalled();
    expect(mockDataSource.createQueryRunner).toHaveBeenCalled(); // Ensure query runner was created
    expect(mockQueryRunner.connect).toHaveBeenCalled(); // Ensure connection
    expect(mockQueryRunner.startTransaction).toHaveBeenCalled(); // Ensure transaction started
    expect(mockQueryRunner.commitTransaction).toHaveBeenCalled(); // Ensure transaction committed
    expect(mockQueryRunner.release).toHaveBeenCalled(); // Ensure query runner released
    expect(notificationsService.sendReservationCreated).toHaveBeenCalledWith(
      createReservationDto.email,
      createReservationDto.name,
      expect.any(String),
    );
  });

  // Test case 2: Creating a reservation with a past date
  it('should return 400 for a reservation with a past date', async () => {
    const restaurantId = randomUUID();
    const pastDate = new Date(MOCKED_DATE.getTime() - 24 * 60 * 60 * 1000); // 1 dzień przed MOCKED_DATE
    pastDate.setUTCHours(12, 0, 0, 0);

    const createReservationDto: CreateReservationDto = {
      restaurantId,
      date: pastDate.toISOString().split('T')[0],
      time: '12:00',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    mockRestaurantRepository.findOne.mockResolvedValueOnce({
      id: restaurantId,
      name: 'Test Restaurant',
      city: 'Test City',
      address: 'Test Address 123',
      openHours: {
        monday: ['10:00', '22:00'],
      },
    });

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(400);

    expect(response.body.message).toContain(
      'Nie można rezerwować dat z przeszłości',
    );
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled(); // No transaction for validation errors
    expect(notificationsService.sendReservationCreated).not.toHaveBeenCalled();
  });

  // Test case 3: Creating a reservation with date too far in the future
  it('should return 400 for a reservation date more than 30 days in future', async () => {
    const restaurantId = randomUUID();
    const futureDate = new Date(
      MOCKED_DATE.getTime() + 31 * 24 * 60 * 60 * 1000,
    ); // 31 dni od MOCKED_DATE
    futureDate.setUTCHours(12, 0, 0, 0);

    const createReservationDto: CreateReservationDto = {
      restaurantId,
      date: futureDate.toISOString().split('T')[0],
      time: '12:00',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    mockRestaurantRepository.findOne.mockResolvedValueOnce({
      id: restaurantId,
      name: 'Test Restaurant',
      city: 'Test City',
      address: 'Test Address 123',
      openHours: {
        monday: ['10:00', '22:00'],
      },
    });

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(400);

    expect(response.body.message).toContain(
      'Można rezerwować maksymalnie 30 dni do przodu',
    );
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled(); // No transaction for validation errors
    expect(notificationsService.sendReservationCreated).not.toHaveBeenCalled();
  });

  // Test case 4: Creating a reservation when restaurant is closed on that day
  it('should return 400 when restaurant is closed on the reservation day', async () => {
    const restaurantId = randomUUID();
    const futureDate = new Date(MOCKED_DATE.getTime() + 24 * 60 * 60 * 1000); // 1 dzień po MOCKED_DATE
    futureDate.setUTCHours(12, 0, 0, 0); // Ustaw na 12:00 UTC

    const dayName = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ][futureDate.getUTCDay()];

    const createReservationDto: CreateReservationDto = {
      restaurantId,
      date: futureDate.toISOString().split('T')[0],
      time: '12:00',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    const closedHours = {
      ...{
        monday: ['10:00', '22:00'],
        tuesday: ['10:00', '22:00'],
        wednesday: ['10:00', '22:00'],
        thursday: ['10:00', '22:00'],
        friday: ['10:00', '22:00'],
        saturday: ['10:00', '22:00'],
        sunday: ['10:00', '22:00'],
      },
    };
    delete closedHours[dayName]; // Symulacja zamknięcia w ten konkretny dzień

    mockRestaurantRepository.findOne.mockResolvedValueOnce({
      id: restaurantId,
      name: 'Test Restaurant',
      city: 'Test City',
      address: 'Test Address 123',
      openHours: closedHours,
    });

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(400);

    expect(response.body.message).toContain('Restauracja jest dziś zamknięta');
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled(); // No transaction for validation errors
    expect(notificationsService.sendReservationCreated).not.toHaveBeenCalled();
  });

  // Test case 5: Creating a reservation outside opening hours
  it('should return 400 for a reservation outside opening hours', async () => {
    const restaurantId = randomUUID();
    const futureDate = new Date(MOCKED_DATE.getTime() + 24 * 60 * 60 * 1000); // 1 dzień po MOCKED_DATE
    futureDate.setUTCHours(9, 0, 0, 0); // Czas przed otwarciem (9:00 UTC)

    const dayName = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ][futureDate.getUTCDay()];

    const createReservationDto: CreateReservationDto = {
      restaurantId,
      date: futureDate.toISOString().split('T')[0],
      time: '09:00',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    mockRestaurantRepository.findOne.mockResolvedValueOnce({
      id: restaurantId,
      name: 'Test Restaurant',
      city: 'Test City',
      address: 'Test Address 123',
      openHours: {
        [dayName]: ['10:00', '22:00'],
      },
    });

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(400);

    expect(response.body.message).toContain(
      'Rezerwacja możliwa tylko między 10:00 a 22:00',
    );
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled(); // No transaction for validation errors
    expect(notificationsService.sendReservationCreated).not.toHaveBeenCalled();
  });

  // Test case 6: Creating a reservation with an invalid time interval
  it('should return 400 for a reservation with an invalid time interval', async () => {
    const restaurantId = randomUUID();
    const futureDate = new Date(MOCKED_DATE.getTime() + 24 * 60 * 60 * 1000); // 1 dzień po MOCKED_DATE
    futureDate.setUTCHours(12, 15, 0, 0); // Czas z nieprawidłowym interwałem (12:15 UTC)

    const dayName = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ][futureDate.getUTCDay()];

    const createReservationDto: CreateReservationDto = {
      restaurantId,
      date: futureDate.toISOString().split('T')[0],
      time: '12:15',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    mockRestaurantRepository.findOne.mockResolvedValueOnce({
      id: restaurantId,
      name: 'Test Restaurant',
      city: 'Test City',
      address: 'Test Address 123',
      openHours: {
        [dayName]: ['10:00', '22:00'],
      },
    });

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(400);

    expect(response.body.message).toContain(
      'Rezerwacja możliwa tylko co 30 minut',
    );
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled(); // No transaction for validation errors
    expect(notificationsService.sendReservationCreated).not.toHaveBeenCalled();
  });

  // Test case 7: Creating a reservation for a non-existent restaurant
  it('should return 404 if the restaurant does not exist', async () => {
    const nonExistentRestaurantId = randomUUID();
    const futureDate = new Date(MOCKED_DATE.getTime() + 24 * 60 * 60 * 1000);
    futureDate.setUTCHours(12, 0, 0, 0);

    const createReservationDto: CreateReservationDto = {
      restaurantId: nonExistentRestaurantId,
      date: futureDate.toISOString().split('T')[0],
      time: '12:00',
      peopleCount: 2,
      name: 'John Doe',
      email: 'john.doe@example.com',
    };

    mockRestaurantRepository.findOne.mockResolvedValueOnce(null); // Symulacja, że restauracja nie została znaleziona

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send(createReservationDto)
      .expect(404);

    expect(response.body.message).toContain('Restauracja nie istnieje');
    expect(mockDataSource.createQueryRunner).not.toHaveBeenCalled(); // No transaction for validation errors
    expect(notificationsService.sendReservationCreated).not.toHaveBeenCalled();
  });
});
