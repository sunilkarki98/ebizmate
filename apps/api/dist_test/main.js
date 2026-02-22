"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const logger = new common_1.Logger('Bootstrap');
    // Global API prefix
    app.setGlobalPrefix('api');
    // CORS
    app.enableCors({
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        credentials: true,
    });
    // Validation
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    // Exception filter
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    // Swagger docs
    const config = new swagger_1.DocumentBuilder()
        .setTitle('EbizMate AI API')
        .setDescription('Internal API for AI processing, webhooks, and core logic')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT ?? 3001;
    await app.listen(port);
    logger.log(`Application is running on: http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map