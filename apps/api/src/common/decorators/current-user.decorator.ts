import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

type CurrentUserKey = keyof Express.User;
type CurrentUserValue = Express.User[CurrentUserKey] | Express.User | undefined;

export const CurrentUser = createParamDecorator<
  CurrentUserKey | undefined,
  CurrentUserValue
>((data, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const user = request.user;

  if (!user) {
    return undefined;
  }

  return data ? user[data] : user;
});
