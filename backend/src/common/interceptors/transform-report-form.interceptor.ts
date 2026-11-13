import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class TransformReportFormInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    if (typeof request.body.published === 'string') {
      if (request.body.published === 'true') {
        request.body.published = true;
      } else if (request.body.published === 'false') {
        request.body.published = false;
      } else {
        throw new BadRequestException(
          'O campo published deve ser true ou false.',
        );
      }
    }

    if (typeof request.body.period === 'string') {
      try {
        request.body.period = JSON.parse(request.body.period);
      } catch {
        throw new BadRequestException(
          'O campo period deve conter um JSON válido.',
        );
      }
    }

    return next.handle();
  }
}
