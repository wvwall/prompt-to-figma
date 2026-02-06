import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Disabilita body parser default, lo configuriamo noi
    bodyParser: false,
  });

  // Body parser custom che sanitizza i caratteri di controllo
  // prima del JSON.parse. Risolve Swagger che manda newline/tab
  // raw dentro le stringhe JSON.
  app.use((req: any, res: any, next: any) => {
    if (req.method === 'POST' && req.headers['content-type']?.includes('application/json')) {
      let raw = '';
      req.setEncoding('utf8');
      req.on('data', (chunk: string) => { raw += chunk; });
      req.on('end', () => {
        // Sostituisci newline/tab/control chars raw con spazio
        const cleaned = raw.replace(/[\x00-\x1F\x7F]/g, (c: string) =>
          c === '\\' ? c : ' '
        );
        try {
          req.body = JSON.parse(cleaned);
        } catch {
          req.body = {};
        }
        next();
      });
    } else {
      // Non-JSON: passa attraverso
      next();
    }
  });

  // CORS per plugin Figma (usa null origin)
  app.enableCors({
    origin: '*',
    methods: ['GET', 'POST'],
  });

  // Prefix /api
  app.setGlobalPrefix('api');

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Prompt to Figma API')
    .setDescription('Genera design Figma da prompt in linguaggio naturale')
    .setVersion('1.0')
    .addTag('design')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Backend running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
