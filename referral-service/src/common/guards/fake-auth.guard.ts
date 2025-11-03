import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class FakeAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    
    // Try session cookie first
    const token = req.cookies?.['session'];
    if (token) {
      const session = await this.authService.verifySession(token);
      if (session) {
        req.user = { id: session.userId };
        return true;
      }
    }

    // Fall back to x-user-id header (for backward compatibility)
    const userId = req.headers['x-user-id'] as string | undefined;
    if (!userId) {
      throw new UnauthorizedException('Authentication required: session cookie or x-user-id header');
    }
    req.user = { id: userId };
    return true;
  }
}




