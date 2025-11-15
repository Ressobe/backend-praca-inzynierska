import { ConfigService } from '@nestjs/config';
import { DataSource, EntityManager, DataSourceOptions } from 'typeorm';

export const DATA_SOURCE_OPTIONS = 'DATA_SOURCE_OPTIONS';
export const DATA_SOURCE = 'DATA_SOURCE';

export const databaseProviders = [
  {
    provide: DATA_SOURCE_OPTIONS,
    useFactory: (configService: ConfigService): DataSourceOptions => {
      return {
        type: 'postgres',
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: 5432,
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASS'),
        database: configService.get<string>('DB_NAME'),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        synchronize: false,
        migrations: [__dirname + '/migrations/**'],
        migrationsTableName: 'custom_migration_table',
      };
    },
    inject: [ConfigService],
  },
  {
    provide: DATA_SOURCE,
    useFactory: async (dataSourceOptions: DataSourceOptions) => {
      const dataSource = new DataSource(dataSourceOptions);
      return dataSource.initialize();
    },
    inject: [DATA_SOURCE_OPTIONS],
  },
  {
    provide: EntityManager,
    useFactory: (dataSource: DataSource) => dataSource.manager,
    inject: [DATA_SOURCE],
  },
];
