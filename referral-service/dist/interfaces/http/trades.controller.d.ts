import { TradesAppService } from '../../application/trades.app.service';
import { MockTradeDto } from './dto/mock-trade.dto';
export declare class TradesController {
    private readonly trades;
    constructor(trades: TradesAppService);
    mock(body: MockTradeDto): Promise<{
        ok: boolean;
    }>;
}
