"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const jwt = __importStar(require("jsonwebtoken"));
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    configService;
    constructor(configService) {
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Dynamically select the secret based on the token issuer
            secretOrKeyProvider: (request, rawJwtToken, done) => {
                try {
                    const decoded = jwt.decode(rawJwtToken);
                    if (!decoded) {
                        return done(new Error('Invalid token format'), null);
                    }
                    // Heuristic: Supabase JWTs contain typical claims like `app_metadata` or `iss` containing 'supabase'.
                    if (decoded.app_metadata || (decoded.iss && decoded.iss.includes('supabase'))) {
                        done(null, this.configService.get('SUPABASE_JWT_SECRET'));
                    }
                    else {
                        // Default to NextAuth - throw if not configured
                        const nextAuthSecret = this.configService.get('NEXTAUTH_SECRET');
                        if (!nextAuthSecret) {
                            throw new Error('NEXTAUTH_SECRET environment variable is required for JWT authentication');
                        }
                        done(null, nextAuthSecret);
                    }
                }
                catch (e) {
                    done(e, null);
                }
            },
        });
        this.configService = configService;
    }
    async validate(payload) {
        if (!payload || (!payload.sub && !payload.id)) {
            throw new common_1.UnauthorizedException('Token payload missing mandatory fields');
        }
        // Normalize payload for the rest of the application
        const userId = payload.sub || payload.id;
        const role = payload.app_metadata?.role || payload.role || 'user';
        const email = payload.email || null;
        const name = payload.name || payload.user_metadata?.full_name || null;
        return { id: userId, sub: userId, userId, role, email, name };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map