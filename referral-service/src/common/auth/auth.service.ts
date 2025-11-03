import { Injectable } from '@nestjs/common';
import { SignJWT, jwtVerify } from 'jose';

@Injectable()
export class AuthService {
  private readonly secret = new TextEncoder().encode(
    process.env.JWT_SECRET || 'your-secret-key-change-in-production-min-32-chars'
  );

  async createSession(userId: string): Promise<string> {
    const token = await new SignJWT({ userId })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(this.secret);

    return token;
  }

  async verifySession(token: string): Promise<{ userId: string } | null> {
    try {
      const { payload } = await jwtVerify(token, this.secret);
      return { userId: payload.userId as string };
    } catch {
      return null;
    }
  }
}

