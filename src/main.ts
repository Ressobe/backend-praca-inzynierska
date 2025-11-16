import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { seedDatabase } from './database/seeds/seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Tavoo')
    .setDescription('The tavoo API')
    .setVersion('1.0')
    .addTag('cats')
    .addBearerAuth()
    .build();

  await seedDatabase(app);

  const document = SwaggerModule.createDocument(app, config);

  app.getHttpAdapter().get('/openapi.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(document));
  });

  app.use(
    '/docs',
    apiReference({
      theme: 'default',
      hideDarkModeToggle: true,
      telemetry: false,
      content: document,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
