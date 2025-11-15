import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || 'postgres',
  database: process.env.DB_NAME || 'app_db',
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: false,
  migrations: ['migrations/*.ts'],
  migrationsTableName: 'custom_migration_table',
});
