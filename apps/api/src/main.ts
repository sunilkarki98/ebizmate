import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { cleanupOpenApiDoc, ZodValidationPipe } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0, // Capture 20% of transactions in prod
  // Profiling
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger));

  // INC-6 FIX: Security headers (X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
  app.use(helmet());

  // Global API prefix
  app.setGlobalPrefix('api');

  // CORS — validate origins to prevent wildcard + credentials combination
  const rawOrigins = process.env.CORS_ORIGIN?.split(',').map(o => o.trim()).filter(Boolean) || ['http://localhost:3000'];
  const validOrigins = rawOrigins.filter(o => o !== '*' && (o.startsWith('http://') || o.startsWith('https://')));
  app.enableCors({
    origin: validOrigins.length > 0 ? validOrigins : ['http://localhost:3000'],
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(new ZodValidationPipe());

  // Exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger docs (disabled in production)
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('EbizMate AI API')
      .setDescription('Internal API for AI processing, webhooks, and core logic')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    cleanupOpenApiDoc(document);
    SwaggerModule.setup('api/docs', app, document);
    console.log('Swagger docs available at /api/docs');
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
