import { Body, Controller, Post, Res, Req, HttpCode } from '@nestjs/common';
import { IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { Response, Request } from 'express';
import { AuthService } from '../../common/auth/auth.service';
import { ReferralAppService } from '../../application/referral.app.service';

class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsOptional()
  inviteCode?: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly referralApp: ReferralAppService,
  ) {}

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Create user ID from email
    const base = (body.email || '').trim().toUpperCase();
    const userId =
      base.length >= 6
        ? base
        : `USER_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // Save email
    await this.referralApp.setUserEmail(userId, body.email);

    // Register with invite code if provided
    let level: number | undefined;
    if (body.inviteCode?.trim()) {
      try {
        level = await this.referralApp.registerReferralByCode(
          userId,
          body.inviteCode.trim(),
        );
      } catch (e) {
        // Ignore if already registered
      }
    }

    // Create session
    const token = await this.authService.createSession(userId);

    // Set httpOnly cookie
    res.cookie('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    return {
      userId,
      level,
      message: 'Logged in successfully',
    };
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('session');
    return { message: 'Logged out successfully' };
  }

  @Post('session')
  @HttpCode(200)
  async getSession(@Req() req: Request) {
    const token = req.cookies?.['session'];
    if (!token) {
      return { userId: null };
    }

    const session = await this.authService.verifySession(token);
    return { userId: session?.userId || null };
  }
}
