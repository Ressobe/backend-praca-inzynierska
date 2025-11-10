import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsValidatorService } from './reservations-validator.service';
import { DataSource, Repository } from 'typeorm';
import { Reservation, ReservationStatus } from '../domain/reservation.entity';
import { ReservationsService } from './reservations.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UpdateStatusDto } from './dto/update-status.dto';
import { Restaurant } from 'src/restaurants/domain/restaurant.entity';

jest.mock('crypto', () => ({
  randomUUID: jest.fn(),
}));
import { randomUUID } from 'crypto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { NotificationsService } from 'src/notifications/application/notifications.service';
import { ConfigService } from '@nestjs/config';

describe('ReservationsService', () => {
  let reservationsValidatorService: ReservationsValidatorService;
  let reservationsService: ReservationsService;
  let reservationsRepository: jest.Mocked<Repository<Reservation>>;
  let restaurantsRepository: jest.Mocked<Repository<Restaurant>>;
  let notificationsService: jest.Mocked<NotificationsService>;
  let dataSource: jest.Mocked<DataSource>;
  let configService: jest.Mocked<ConfigService>;

  const mockReservationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRestaurantRepository = {
    findOne: jest.fn(),
  };

  const mockNotificationsService = {
    sendReservationCreated: jest.fn(),
    sendReservationCancelled: jest.fn(),
    sendReservationStatusUpdated: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      create: jest.fn(),
      save: jest.fn((entityOrTarget: any, maybeEntity?: any) => {
        // If save is called with two arguments (EntityClass, entityObject)
        if (maybeEntity) {
          return Promise.resolve(maybeEntity); // Return the entity object
        }
        // If called with one argument (entityObject)
        return Promise.resolve(entityOrTarget);
      }),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'FRONTEND_URL') {
        return 'http://localhost:3000';
      }
      return undefined;
    }),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.setSystemTime(new Date('2025-10-26T00:00:00.000Z')); // Ustawienie czasu systemowego na niedzielę

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReservationsValidatorService,
        ReservationsService,
        {
          provide: getRepositoryToken(Reservation),
          useValue: mockReservationRepository,
        },
        {
          provide: getRepositoryToken(Restaurant),
          useValue: mockRestaurantRepository,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    reservationsValidatorService = module.get<ReservationsValidatorService>(
      ReservationsValidatorService,
    );
    reservationsService = module.get<ReservationsService>(ReservationsService);
    reservationsRepository = module.get(getRepositoryToken(Reservation));
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));
    notificationsService = module.get(NotificationsService);
    dataSource = module.get(DataSource);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockClear(); // Czyszczenie mocka randomUUID
    mockQueryRunner.manager.create.mockClear();
    mockQueryRunner.manager.save.mockClear();
  });

  it('should be defined', () => {
    expect(reservationsService).toBeDefined();
    expect(reservationsValidatorService).toBeDefined();
    expect(notificationsService).toBeDefined();
    expect(dataSource).toBeDefined();
    expect(configService).toBeDefined();
  });

  describe('validateDate', () => {
    it('should throw BadRequestException if reservation date is in the past', () => {
      const pastDate = new Date('2025-10-25T10:00:00.000Z');

      expect(() => reservationsValidatorService.validateDate(pastDate)).toThrow(
        BadRequestException,
      );
      expect(() => reservationsValidatorService.validateDate(pastDate)).toThrow(
        'Nie można rezerwować dat z przeszłości',
      );
    });

    it('should accept a reservation date exactly 30 days in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      expect(() =>
        reservationsValidatorService.validateDate(futureDate),
      ).not.toThrow();
    });

    it('should accept a reservation date less than 30 days in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);

      expect(() =>
        reservationsValidatorService.validateDate(futureDate),
      ).not.toThrow();
    });

    it('should throw BadRequestException if reservation date is more than 30 days in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 31);

      expect(() =>
        reservationsValidatorService.validateDate(futureDate),
      ).toThrow(BadRequestException);
      expect(() =>
        reservationsValidatorService.validateDate(futureDate),
      ).toThrow('Można rezerwować maksymalnie 30 dni do przodu');
    });
  });

  describe('validateOpeningHours', () => {
    const openHoursForSundayAndMonday: Restaurant['openHours'] = {
      sunday: ['09:00', '23:00'],
      monday: ['10:00', '22:00'],
    };

    const openHoursClosedOnSunday: Restaurant['openHours'] = {
      monday: ['10:00', '22:00'],
    };

    it('should accept a reservation if it is within restaurant opening hours', () => {
      // Używamy daty lokalnej (bez Z) z godziny 12:00 w niedzielę, by pasowało do 09:00-23:00
      const dateInHours = new Date('2025-10-26T12:00:00');

      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateInHours,
          openHoursForSundayAndMonday,
        ),
      ).not.toThrow();
    });

    it('should reject a reservation if it is before restaurant opening hours', () => {
      // Używamy daty lokalnej (bez Z) z godziny 08:00 w niedzielę, która jest przed 09:00
      const dateBeforeHours = new Date('2025-10-26T08:00:00');

      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateBeforeHours,
          openHoursForSundayAndMonday,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateBeforeHours,
          openHoursForSundayAndMonday,
        ),
      ).toThrow('Rezerwacja możliwa tylko między 09:00 a 23:00');
    });

    it('should reject a reservation if it is after restaurant opening hours', () => {
      // Używamy daty lokalnej (bez Z) z godziny 23:01 w niedzielę, która jest po 23:00
      const dateAfterHours = new Date('2025-10-26T23:01:00');

      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateAfterHours,
          openHoursForSundayAndMonday,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateAfterHours,
          openHoursForSundayAndMonday,
        ),
      ).toThrow('Rezerwacja możliwa tylko między 09:00 a 23:00');
    });

    it('should reject a reservation if the restaurant is closed on the given day', () => {
      // Używamy daty lokalnej (bez Z) z godziny 12:00 w niedzielę, dla restauracji zamkniętej w niedziele
      const dateClosedDay = new Date('2025-10-26T12:00:00');

      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateClosedDay,
          openHoursClosedOnSunday,
        ),
      ).toThrow(BadRequestException);
      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateClosedDay,
          openHoursClosedOnSunday,
        ),
      ).toThrow('Restauracja jest dziś zamknięta');
    });

    it('should reject a reservation if openHours are undefined for the restaurant', () => {
      const date = new Date('2025-10-26T12:00:00');

      expect(() =>
        reservationsValidatorService.validateOpeningHours(date, undefined),
      ).toThrow(BadRequestException);
      expect(() =>
        reservationsValidatorService.validateOpeningHours(date, undefined),
      ).toThrow('Restauracja jest dziś zamknięta');
    });
  });

  describe('validateReservationInterval', () => {
    it('should accept a reservation if minutes are 00', () => {
      const date = new Date('2025-10-27T14:00:00.000Z');

      expect(() =>
        reservationsValidatorService.validateReservationInterval(date),
      ).not.toThrow();
    });

    it('should accept a reservation if minutes are 30', () => {
      const date = new Date('2025-10-27T14:30:00.000Z');

      expect(() =>
        reservationsValidatorService.validateReservationInterval(date),
      ).not.toThrow();
    });

    it('should reject a reservation if minutes are not 00 or 30', () => {
      const date = new Date('2025-10-27T14:15:00.000Z');

      expect(() =>
        reservationsValidatorService.validateReservationInterval(date),
      ).toThrow(BadRequestException);
      expect(() =>
        reservationsValidatorService.validateReservationInterval(date),
      ).toThrow('Rezerwacja możliwa tylko co 30 minut');
    });
  });

  describe('create', () => {
    const restaurantId = 'some-restaurant-id';
    const mockRestaurant = {
      id: restaurantId,
      name: 'Test Restaurant',
      openHours: {
        monday: ['10:00', '22:00'],
        tuesday: ['10:00', '22:00'],
        wednesday: ['10:00', '22:00'],
        thursday: ['10:00', '22:00'],
        friday: ['10:00', '22:00'],
        saturday: ['10:00', '22:00'],
        sunday: ['10:00', '22:00'],
      },
    } as unknown as Restaurant;

    const baseDto: CreateReservationDto = {
      restaurantId,
      name: 'John Doe',
      email: 'john@example.com',
      peopleCount: 2,
      date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
      time: '12:00',
    };

    beforeEach(() => {
      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);

      // Mock queryRunner.manager for operations inside the transaction in the service
      mockQueryRunner.manager.create.mockImplementation(
        (entity, dto) =>
          ({
            // Zwracamy dto z cancelToken, tak jak jest przekazane
            id: 'some-uuid',
            ...dto,
            status: ReservationStatus.PENDING,
            createdAt: new Date(),
            updatedAt: new Date(),
            restaurant: mockRestaurant,
          }) as Reservation,
      );
      mockQueryRunner.manager.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );

      jest
        .spyOn(reservationsValidatorService, 'validateDate')
        .mockImplementation(() => {});
      jest
        .spyOn(reservationsValidatorService, 'validateOpeningHours')
        .mockImplementation(() => {});
      jest
        .spyOn(reservationsValidatorService, 'validateReservationInterval')
        .mockImplementation(() => {});
      mockNotificationsService.sendReservationCreated.mockResolvedValue(
        undefined,
      );
      mockQueryRunner.commitTransaction.mockClear();
      mockQueryRunner.rollbackTransaction.mockClear();
      mockQueryRunner.release.mockClear();
    });

    it('should generate and assign a unique cancellation token when creating a reservation', async () => {
      const mockUuid = 'generated-uuid-123';
      (randomUUID as jest.Mock).mockReturnValue(mockUuid);

      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString().split('T')[0],
      };

      await reservationsService.create(dto);

      expect(randomUUID).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.create).toHaveBeenCalledWith(
        Reservation,
        expect.objectContaining({
          cancelToken: mockUuid,
        }),
      );
    });

    it('should call validator services during reservation creation', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString().split('T')[0],
      };

      await reservationsService.create(dto);

      expect(reservationsValidatorService.validateDate).toHaveBeenCalledWith(
        expect.any(Date),
      );
      expect(
        reservationsValidatorService.validateOpeningHours,
      ).toHaveBeenCalledWith(expect.any(Date), mockRestaurant.openHours);
      expect(
        reservationsValidatorService.validateReservationInterval,
      ).toHaveBeenCalledWith(expect.any(Date));
    });

    it('should throw NotFoundException if restaurant does not exist', async () => {
      restaurantsRepository.findOne.mockResolvedValue(null);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: new Date().toISOString().split('T')[0],
      };
      await expect(reservationsService.create(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(reservationsService.create(dto)).rejects.toThrow(
        'Restauracja nie istnieje',
      );
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should throw an error if FRONTEND_URL is not set', async () => {
      configService.get.mockReturnValueOnce(undefined);
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString().split('T')[0],
      };

      await expect(reservationsService.create(dto)).rejects.toThrow(
        'Frontend url not set in enviroment',
      );
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should use a transaction for creation and commit on success', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString().split('T')[0],
      };

      await reservationsService.create(dto);

      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error during creation', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString().split('T')[0],
      };

      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('Simulated save error'),
      );

      await expect(reservationsService.create(dto)).rejects.toThrow(
        'Simulated save error',
      );

      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateStatus', () => {
    const reservationId = 'some-reservation-id';
    const baseReservation: Reservation = {
      id: reservationId,
      name: 'John Doe',
      email: 'john@example.com',
      peopleCount: 2,
      date: new Date('2025-11-01T12:00:00.000Z'),
      time: '12:00',
      status: ReservationStatus.PENDING,
      cancelToken: 'some-token',
      restaurantId: 'some-restaurant-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      restaurant: {} as any,
    };

    beforeEach(() => {
      mockQueryRunner.manager.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );
      mockNotificationsService.sendReservationStatusUpdated.mockResolvedValue(
        undefined,
      );
      mockQueryRunner.commitTransaction.mockClear();
      mockQueryRunner.rollbackTransaction.mockClear();
      mockQueryRunner.release.mockClear();
    });

    it('should update status from PENDING to ACCEPTED successfully', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      const result = await reservationsService.updateStatus(
        reservationId,
        updateDto,
      );

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: reservationId },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: reservationId,
          status: ReservationStatus.ACCEPTED,
        }),
      );
      expect(result.status).toEqual(ReservationStatus.ACCEPTED);
    });

    it('should update status from PENDING to REJECTED successfully', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.REJECTED };

      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      const result = await reservationsService.updateStatus(
        reservationId,
        updateDto,
      );

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: reservationId },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: reservationId,
          status: ReservationStatus.REJECTED,
        }),
      );
      expect(result.status).toEqual(ReservationStatus.REJECTED);
    });

    it('should throw NotFoundException if reservation does not exist', async () => {
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };
      reservationsRepository.findOne.mockResolvedValue(null);

      await expect(
        reservationsService.updateStatus('non-existent-id', updateDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        reservationsService.updateStatus('non-existent-id', updateDto),
      ).rejects.toThrow('Rezerwacja nie istnieje');
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if trying to update status of a CANCELLED reservation', async () => {
      const cancelledReservation = {
        ...baseReservation,
        status: ReservationStatus.CANCELLED,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(cancelledReservation);

      await expect(
        reservationsService.updateStatus(reservationId, updateDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        reservationsService.updateStatus(reservationId, updateDto),
      ).rejects.toThrow('Nie można zmienić statusu anulowanej rezerwacji');
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
    });

    it('should return the same reservation if status is already the same', async () => {
      const acceptedReservation = {
        ...baseReservation,
        status: ReservationStatus.ACCEPTED,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(acceptedReservation);

      const result = await reservationsService.updateStatus(
        reservationId,
        updateDto,
      );

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: reservationId },
      });
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(result).toEqual(acceptedReservation);
    });

    it('should call notificationsService.sendReservationStatusUpdated on successful status update', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      await reservationsService.updateStatus(reservationId, updateDto);

      expect(
        notificationsService.sendReservationStatusUpdated,
      ).toHaveBeenCalledWith(
        pendingReservation.email,
        pendingReservation.name,
        ReservationStatus.ACCEPTED,
      );
    });

    it('should use a transaction for status update and commit on success', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      await reservationsService.updateStatus(reservationId, updateDto);

      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error during status update', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(pendingReservation);
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('Simulated save error'),
      );

      await expect(
        reservationsService.updateStatus(reservationId, updateDto),
      ).rejects.toThrow('Simulated save error');

      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancelByToken', () => {
    const reservationToken = 'valid-cancel-token-123';
    const nonExistentToken = 'invalid-token-abc';
    const baseReservation: Reservation = {
      id: 'res-id-1',
      name: 'Jane Doe',
      email: 'jane@example.com',
      peopleCount: 3,
      date: new Date('2025-11-05T18:00:00.000Z'),
      time: '18:00',
      status: ReservationStatus.PENDING,
      cancelToken: reservationToken,
      restaurantId: 'rest-id-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      restaurant: {} as any,
    };

    beforeEach(() => {
      mockQueryRunner.manager.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );
      mockNotificationsService.sendReservationCancelled.mockResolvedValue(
        undefined,
      );
      mockQueryRunner.commitTransaction.mockClear();
      mockQueryRunner.rollbackTransaction.mockClear();
      mockQueryRunner.release.mockClear();
    });

    it('should cancel a reservation with a valid token', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      const result = await reservationsService.cancelByToken(reservationToken);

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { cancelToken: reservationToken },
      });
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...pendingReservation,
          status: ReservationStatus.CANCELLED,
        }),
      );
      expect(result).toEqual({ message: 'Rezerwacja została anulowana.' });
    });

    it('should throw NotFoundException if cancellation token does not exist', async () => {
      reservationsRepository.findOne.mockResolvedValue(null);

      await expect(
        reservationsService.cancelByToken(nonExistentToken),
      ).rejects.toThrow(NotFoundException);
      await expect(
        reservationsService.cancelByToken(nonExistentToken),
      ).rejects.toThrow('Nie znaleziono rezerwacji');
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if reservation is already CANCELLED', async () => {
      const cancelledReservation = {
        ...baseReservation,
        status: ReservationStatus.CANCELLED,
      };
      reservationsRepository.findOne.mockResolvedValue(cancelledReservation);

      await expect(
        reservationsService.cancelByToken(reservationToken),
      ).rejects.toThrow(BadRequestException);
      await expect(
        reservationsService.cancelByToken(reservationToken),
      ).rejects.toThrow('Rezerwacja jest już anulowana.');
      expect(mockQueryRunner.manager.save).not.toHaveBeenCalled();
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('should call notificationsService.sendReservationCancelled on successful cancellation', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      await reservationsService.cancelByToken(reservationToken);

      expect(
        notificationsService.sendReservationCancelled,
      ).toHaveBeenCalledWith(pendingReservation.email, pendingReservation.name);
    });

    it('should use a transaction for cancellation and commit on success', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      reservationsRepository.findOne.mockResolvedValue(pendingReservation);

      await reservationsService.cancelByToken(reservationToken);

      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('should rollback transaction on error during cancellation', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      reservationsRepository.findOne.mockResolvedValue(pendingReservation);
      mockQueryRunner.manager.save.mockRejectedValueOnce(
        new Error('Simulated save error'),
      );

      await expect(
        reservationsService.cancelByToken(reservationToken),
      ).rejects.toThrow('Simulated save error');

      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.manager.save).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });
  });
});
