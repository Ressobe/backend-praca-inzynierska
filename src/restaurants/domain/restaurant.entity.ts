import { AbstractEntity } from 'src/database/abstract.entity';
import { Reservation } from 'src/reservations/domain/reservation.entity';
import { User } from 'src/users/domain/user.entity';
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity({ name: 'restaurants' })
export class Restaurant extends AbstractEntity<Restaurant> {
  @Column()
  name: string;

  @Column()
  city: string;

  @Column()
  address: string;

  @Column({ nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  openHours?: Record<string, [string, string]>;

  @Column({ type: 'float', default: 0 })
  rating: number;

  @Column({ nullable: true })
  image?: string;

  @Column({ nullable: true })
  cuisine?: string;

  @OneToMany(() => User, (user) => user.restaurant)
  users: User[];

  @OneToMany(() => Reservation, (reservation) => reservation.restaurant)
  reservations: Reservation[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
