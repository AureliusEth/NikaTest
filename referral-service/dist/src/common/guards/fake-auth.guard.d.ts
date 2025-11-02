import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class FakeAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
