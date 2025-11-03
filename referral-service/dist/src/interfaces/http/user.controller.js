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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const referral_app_service_1 = require("../../application/referral.app.service");
const fake_auth_guard_1 = require("../../common/guards/fake-auth.guard");
class SetEmailDto {
    email;
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], SetEmailDto.prototype, "email", void 0);
let UserController = class UserController {
    app;
    constructor(app) {
        this.app = app;
    }
    async setEmail(req, body) {
        await this.app.setUserEmail(req.user.id, body.email);
        return { ok: true };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Post)('email'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, SetEmailDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "setEmail", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('api/user'),
    (0, common_1.UseGuards)(fake_auth_guard_1.FakeAuthGuard),
    __metadata("design:paramtypes", [referral_app_service_1.ReferralAppService])
], UserController);
//# sourceMappingURL=user.controller.js.map