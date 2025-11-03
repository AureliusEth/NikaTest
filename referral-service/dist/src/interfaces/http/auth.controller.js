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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const class_validator_1 = require("class-validator");
const auth_service_1 = require("../../common/auth/auth.service");
const referral_app_service_1 = require("../../application/referral.app.service");
class LoginDto {
    email;
    inviteCode;
}
__decorate([
    (0, class_validator_1.IsEmail)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], LoginDto.prototype, "email", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], LoginDto.prototype, "inviteCode", void 0);
let AuthController = class AuthController {
    authService;
    referralApp;
    constructor(authService, referralApp) {
        this.authService = authService;
        this.referralApp = referralApp;
    }
    async login(body, res) {
        const base = (body.email || '').trim().toUpperCase();
        const userId = base.length >= 6 ? base : `USER_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
        await this.referralApp.setUserEmail(userId, body.email);
        let level;
        if (body.inviteCode?.trim()) {
            try {
                level = await this.referralApp.registerReferralByCode(userId, body.inviteCode.trim());
            }
            catch (e) {
            }
        }
        const token = await this.authService.createSession(userId);
        res.cookie('session', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return {
            userId,
            level,
            message: 'Logged in successfully'
        };
    }
    async logout(res) {
        res.clearCookie('session');
        return { message: 'Logged out successfully' };
    }
    async getSession(req) {
        const token = req.cookies?.['session'];
        if (!token) {
            return { userId: null };
        }
        const session = await this.authService.verifySession(token);
        return { userId: session?.userId || null };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('session'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getSession", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        referral_app_service_1.ReferralAppService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map