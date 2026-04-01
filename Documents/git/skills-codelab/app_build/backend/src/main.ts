import 'dotenv/config'; // Config Env Listo
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Apertura provisional de CORS para el entorno Embed/Local
  // Idealmente en Prod, los Origins se restringen a dominios inscritos por el Tenant
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Filtro de Errores Globales Seguro
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Sanitización de Body JSON de entrada estricta
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Descarta campos basura no esperados
      forbidNonWhitelisted: true, // Explota con un 400 si viene basura
      transform: true, // Transforma strings a Numbers implícitos
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
