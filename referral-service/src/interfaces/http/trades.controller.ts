import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { FakeAuthGuard } from '../../common/guards/fake-auth.guard';
import { TradesAppService } from '../../application/trades.app.service';
import { MockTradeDto } from './dto/mock-trade.dto';

@Controller('api/trades')
@UseGuards(FakeAuthGuard)
export class TradesController {
  constructor(private readonly trades: TradesAppService) {}

  @Post('mock')
  async mock(@Body() body: MockTradeDto) {
    await this.trades.processTrade({ tradeId: body.tradeId, userId: body.userId, feeAmount: body.feeAmount, token: body.token });
    return { ok: true };
  }
}


