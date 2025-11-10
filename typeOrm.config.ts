import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'app_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'custom_migration_table',
});
