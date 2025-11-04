import { Body, Controller, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { FakeAuthGuard } from '../../common/guards/fake-auth.guard';
import { TradesAppService } from '../../application/trades.app.service';
import { MockTradeDto } from './dto/mock-trade.dto';

@Controller('api/trades')
@UseGuards(FakeAuthGuard)
export class TradesController {
  private readonly logger = new Logger(TradesController.name);

  constructor(private readonly trades: TradesAppService) {}

  @Post('mock')
  async mock(@Req() req: any, @Body() body: MockTradeDto) {
    // CRITICAL: For mock trades, prioritize body.userId over authenticated user
    // This allows generating trades for referees (which is needed for testing)
    // The x-user-id header is set to the referee, but session cookie is the current user
    this.logger.debug('Received trade request', {
      bodyUserId: body.userId,
      reqUserId: req.user?.id,
      sessionCookie: req.cookies?.session ? 'present' : 'missing'
    });
    
    const userId = body.userId || req.user?.id;
    
    this.logger.debug(`Using userId: ${userId}`);
    
    if (!userId) {
      throw new Error('User ID required: provide userId in body or authenticate');
    }
    
    await this.trades.processTrade({ 
      tradeId: body.tradeId, 
      userId,  // Use body.userId (referee) or fallback to authenticated user
      feeAmount: body.feeAmount, 
      token: body.token,
      chain: body.chain
    });
    return { ok: true };
  }
}


