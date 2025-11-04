import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.['session'];

    if (!token) {
      throw new UnauthorizedException('No session cookie');
    }

    const session = await this.authService.verifySession(token);
    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    request.user = { id: session.userId };
    return true;
  }
}
