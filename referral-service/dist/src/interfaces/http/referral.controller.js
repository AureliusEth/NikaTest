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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReferralController = void 0;
const common_1 = require("@nestjs/common");
const fake_auth_guard_1 = require("../../common/guards/fake-auth.guard");
const referral_app_service_1 = require("../../application/referral.app.service");
const referral_register_dto_1 = require("./dto/referral-register.dto");
let ReferralController = class ReferralController {
    app;
    constructor(app) {
        this.app = app;
    }
    async generate(req) {
        const code = await this.app.createOrGetReferralCode(req.user.id);
        return { code };
    }
    async register(req, body) {
        const level = await this.app.registerReferralByCode(req.user.id, body.code);
        return { level };
    }
    async network(req) {
        return this.app.getNetwork(req.user.id);
    }
    async earnings(req) {
        return this.app.getEarnings(req.user.id);
    }
};
exports.ReferralController = ReferralController;
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "generate", null);
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, referral_register_dto_1.ReferralRegisterDto]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('network'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "network", null);
__decorate([
    (0, common_1.Get)('earnings'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ReferralController.prototype, "earnings", null);
exports.ReferralController = ReferralController = __decorate([
    (0, common_1.Controller)('api/referral'),
    (0, common_1.UseGuards)(fake_auth_guard_1.FakeAuthGuard),
    __metadata("design:paramtypes", [referral_app_service_1.ReferralAppService])
], ReferralController);
//# sourceMappingURL=referral.controller.js.map