import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TransformResponse<T> {
  data: T;
  meta: {
    timestamp: string;
  };
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  TransformResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<TransformResponse<T>> {
    return next.handle().pipe(
      map((data: T) => {
        if (data instanceof StreamableFile) {
          return data as unknown as TransformResponse<T>;
        }

        // Si ya viene con formato paginado { data, meta }, pasarlo tal cual
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'meta' in data
        ) {
          return data as unknown as TransformResponse<T>;
        }

        return {
          data,
          meta: {
            timestamp: new Date().toISOString(),
          },
        };
      }),
    );
  }
}
