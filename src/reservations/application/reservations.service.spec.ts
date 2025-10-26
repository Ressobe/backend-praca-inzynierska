import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ReservationsValidatorService } from './reservations-validator.service';
import { Repository } from 'typeorm';
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

describe('ReservationsService', () => {
  let reservationsValidatorService: ReservationsValidatorService;
  let reservationsService: ReservationsService;
  let reservationsRepository: jest.Mocked<Repository<Reservation>>;
  let restaurantsRepository: jest.Mocked<Repository<Restaurant>>;

  const mockReservationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const mockRestaurantRepository = {
    findOne: jest.fn(),
  };

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(async () => {
    jest.setSystemTime(new Date('2025-10-26T00:00:00.000Z'));

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
      ],
    }).compile();

    reservationsValidatorService = module.get<ReservationsValidatorService>(
      ReservationsValidatorService,
    );
    reservationsService = module.get<ReservationsService>(ReservationsService);
    reservationsRepository = module.get(getRepositoryToken(Reservation));
    restaurantsRepository = module.get(getRepositoryToken(Restaurant));

    jest.clearAllMocks();
    (randomUUID as jest.Mock).mockClear();
  });

  it('should be defined', () => {
    expect(reservationsService).toBeDefined();
    expect(reservationsValidatorService).toBeDefined();
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
      const dateInHours = new Date('2025-10-26T12:00:00.000Z');

      expect(() =>
        reservationsValidatorService.validateOpeningHours(
          dateInHours,
          openHoursForSundayAndMonday,
        ),
      ).not.toThrow();
    });

    it('should reject a reservation if it is before restaurant opening hours', () => {
      const dateBeforeHours = new Date('2025-10-26T08:00:00.000Z');

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
      const dateAfterHours = new Date('2025-10-26T23:01:00.000Z');

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
      const dateClosedDay = new Date('2025-10-26T12:00:00.000Z');

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
      const date = new Date('2025-10-26T12:00:00.000Z');

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
      date: new Date().toISOString(),
    };

    beforeEach(() => {
      restaurantsRepository.findOne.mockResolvedValue(mockRestaurant);
      reservationsRepository.create.mockImplementation(
        (dto) =>
          ({
            id: 'some-uuid',
            ...dto,
            status: ReservationStatus.PENDING,
            cancelToken: 'mock-token',
            createdAt: new Date(),
            updatedAt: new Date(),
            restaurant: mockRestaurant,
          }) as Reservation,
      );
      reservationsRepository.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );

      (randomUUID as jest.Mock).mockClear();
      jest
        .spyOn(reservationsValidatorService, 'validateDate')
        .mockImplementation(() => {});
      jest
        .spyOn(reservationsValidatorService, 'validateOpeningHours')
        .mockImplementation(() => {});
      jest
        .spyOn(reservationsValidatorService, 'validateReservationInterval')
        .mockImplementation(() => {});
    });

    it('should generate and assign a unique cancellation token when creating a reservation', async () => {
      const mockUuid = 'generated-uuid-123';
      (randomUUID as jest.Mock).mockReturnValue(mockUuid);

      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString(),
      };

      await reservationsService.create(dto);

      expect(randomUUID).toHaveBeenCalledTimes(1);
      expect(reservationsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelToken: mockUuid,
        }),
      );
    });

    // Dodano mockowanie walidatora, aby testować logikę `create` w izolacji od walidacji
    it('should call validator services during reservation creation', async () => {
      const validDate = new Date();
      validDate.setDate(validDate.getDate() + 1);
      const dto: CreateReservationDto = {
        ...baseDto,
        date: validDate.toISOString(),
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
        date: new Date().toISOString(),
      };
      await expect(reservationsService.create(dto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(reservationsService.create(dto)).rejects.toThrow(
        'Restauracja nie istnieje',
      );
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
      status: ReservationStatus.PENDING,
      cancelToken: 'some-token',
      restaurantId: 'some-restaurant-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      restaurant: {} as any,
    };

    it('should update status from PENDING to ACCEPTED successfully', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      const updateDto: UpdateStatusDto = { status: ReservationStatus.ACCEPTED };

      reservationsRepository.findOne.mockResolvedValue(pendingReservation);
      reservationsRepository.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );

      const result = await reservationsService.updateStatus(
        reservationId,
        updateDto,
      );

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: reservationId },
      });
      expect(reservationsRepository.save).toHaveBeenCalledWith(
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
      reservationsRepository.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );

      const result = await reservationsService.updateStatus(
        reservationId,
        updateDto,
      );

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { id: reservationId },
      });
      expect(reservationsRepository.save).toHaveBeenCalledWith(
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
      expect(reservationsRepository.save).not.toHaveBeenCalled();
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
      status: ReservationStatus.PENDING,
      cancelToken: reservationToken,
      restaurantId: 'rest-id-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      restaurant: {} as any,
    };

    it('should cancel a reservation with a valid token', async () => {
      const pendingReservation = {
        ...baseReservation,
        status: ReservationStatus.PENDING,
      };
      reservationsRepository.findOne.mockResolvedValue(pendingReservation);
      reservationsRepository.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );

      const result = await reservationsService.cancelByToken(reservationToken);

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { cancelToken: reservationToken },
      });
      expect(reservationsRepository.save).toHaveBeenCalledWith(
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
      expect(reservationsRepository.save).not.toHaveBeenCalled();
    });

    it('should allow re-cancelling an already cancelled reservation (current behavior)', async () => {
      const cancelledReservation = {
        ...baseReservation,
        status: ReservationStatus.CANCELLED,
      };
      reservationsRepository.findOne.mockResolvedValue(cancelledReservation);
      reservationsRepository.save.mockImplementation((entity: Reservation) =>
        Promise.resolve(entity),
      );

      const result = await reservationsService.cancelByToken(reservationToken);

      expect(reservationsRepository.findOne).toHaveBeenCalledWith({
        where: { cancelToken: reservationToken },
      });
      expect(reservationsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          ...cancelledReservation,
          status: ReservationStatus.CANCELLED,
        }),
      );
      expect(result).toEqual({ message: 'Rezerwacja została anulowana.' });
    });
  });
});
