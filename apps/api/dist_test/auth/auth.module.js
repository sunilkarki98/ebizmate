"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const passport_1 = require("@nestjs/passport");
const jwt_1 = require("@nestjs/jwt");
const jwt_strategy_1 = require("./jwt.strategy");
const auth_sync_controller_1 = require("./sync/auth-sync.controller");
const auth_sync_service_1 = require("./sync/auth-sync.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                useFactory: (config) => ({
                    secret: config.getOrThrow('NEXTAUTH_SECRET'),
                }),
                inject: [config_1.ConfigService],
            }),
        ],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, auth_sync_service_1.AuthSyncService],
        controllers: [auth_controller_1.AuthController, auth_sync_controller_1.AuthSyncController],
        exports: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map