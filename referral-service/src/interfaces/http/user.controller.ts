import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { ReferralAppService } from '../../application/referral.app.service';
import { FakeAuthGuard } from '../../common/guards/fake-auth.guard';

class SetEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

@Controller('api/user')
@UseGuards(FakeAuthGuard)
export class UserController {
  constructor(private readonly app: ReferralAppService) {}

  @Post('email')
  async setEmail(@Req() req: any, @Body() body: SetEmailDto) {
    await this.app.setUserEmail(req.user.id, body.email);
    return { ok: true };
  }
}
