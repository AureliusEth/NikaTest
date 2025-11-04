"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TradesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradesController = void 0;
const common_1 = require("@nestjs/common");
const fake_auth_guard_1 = require("../../common/guards/fake-auth.guard");
const trades_app_service_1 = require("../../application/trades.app.service");
const mock_trade_dto_1 = require("./dto/mock-trade.dto");
let TradesController = TradesController_1 = class TradesController {
    trades;
    logger = new common_1.Logger(TradesController_1.name);
    constructor(trades) {
        this.trades = trades;
    }
    async mock(req, body) {
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
            userId,
            feeAmount: body.feeAmount,
            token: body.token,
            chain: body.chain
        });
        return { ok: true };
    }
};
exports.TradesController = TradesController;
__decorate([
    (0, common_1.Post)('mock'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, mock_trade_dto_1.MockTradeDto]),
    __metadata("design:returntype", Promise)
], TradesController.prototype, "mock", null);
exports.TradesController = TradesController = TradesController_1 = __decorate([
    (0, common_1.Controller)('api/trades'),
    (0, common_1.UseGuards)(fake_auth_guard_1.FakeAuthGuard),
    __metadata("design:paramtypes", [trades_app_service_1.TradesAppService])
], TradesController);
//# sourceMappingURL=trades.controller.js.map