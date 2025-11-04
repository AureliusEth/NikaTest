import { TradesAppService } from '../../application/trades.app.service';
import { MockTradeDto } from './dto/mock-trade.dto';
export declare class TradesController {
    private readonly trades;
    private readonly logger;
    constructor(trades: TradesAppService);
    mock(req: any, body: MockTradeDto): Promise<{
        ok: boolean;
    }>;
}
