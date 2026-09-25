import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { mountStudioUiAssets } from '@guidify-ai/vapi-studio';
import { AppModule } from './app.module';
import { registerShadows } from './shadows/register';

async function bootstrap() {
  registerShadows();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: false,
  });
  app.enableCors({ origin: true, credentials: true });
  // Nest may be duplicated under the framework package until peerDeps align.
  mountStudioUiAssets(app as any);
  const port = Number(process.env.PORT ?? 9999);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`vapi-studio-project listening on ${port}`);
}

bootstrap();
