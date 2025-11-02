import { Body, Controller, Get, Post, Req, UseGuards, Query } from '@nestjs/common';
import { FakeAuthGuard } from '../../common/guards/fake-auth.guard';
import { ReferralAppService } from '../../application/referral.app.service';
import { ReferralRegisterDto } from './dto/referral-register.dto';

@Controller('api/referral')
@UseGuards(FakeAuthGuard)
export class ReferralController {
  constructor(private readonly app: ReferralAppService) {}

  @Post('generate')
  async generate(@Req() req: any) {
    const code = await this.app.createOrGetReferralCode(req.user.id);
    return { code };
  }

  @Post('register')
  async register(@Req() req: any, @Body() body: ReferralRegisterDto) {
    const level = await this.app.registerReferralByCode(req.user.id, body.code);
    return { level };
  }

  @Get('network')
  async network(@Req() req: any) {
    return this.app.getNetwork(req.user.id);
  }

  @Get('earnings')
  async earnings(@Req() req: any) {
    return this.app.getEarnings(req.user.id);
  }

  @Get('dashboard')
  async dashboard(@Req() req: any) {
    return this.app.getDashboard(req.user.id);
  }

  @Get('activity')
  async activity(@Req() req: any, @Query('limit') limit?: string) {
    return this.app.getActivity(req.user.id, limit ? parseInt(limit, 10) : 50);
  }
}


