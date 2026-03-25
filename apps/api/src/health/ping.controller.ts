import { Controller, Get } from '@nestjs/common';

/** Public liveness — no DB/redis (load balancers, e2e smoke). */
@Controller()
export class PingController {
  @Get('ping')
  ping() {
    return { status: 'ok', service: 'ebizmate-api' };
  }
}
