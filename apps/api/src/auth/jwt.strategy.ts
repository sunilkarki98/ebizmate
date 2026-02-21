import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Dynamically select the secret based on the token issuer
            secretOrKeyProvider: (request, rawJwtToken, done) => {
                try {
                    const decoded = jwt.decode(rawJwtToken) as any;

                    if (!decoded) {
                        return done(new Error('Invalid token format'), null);
                    }

                    // Heuristic: Supabase JWTs contain typical claims like `app_metadata` or `iss` containing 'supabase'.
                    if (decoded.app_metadata || (decoded.iss && decoded.iss.includes('supabase'))) {
                        done(null, this.configService.get<string>('SUPABASE_JWT_SECRET'));
                    } else {
                        // Default to NextAuth
                        done(null, this.configService.get<string>('NEXTAUTH_SECRET') || 'fallback-secret');
                    }
                } catch (e) {
                    done(e, null);
                }
            },
        });
    }

    async validate(payload: any) {
        if (!payload || (!payload.sub && !payload.id)) {
            throw new UnauthorizedException('Token payload missing mandatory fields');
        }

        // Normalize payload for the rest of the application
        const userId = payload.sub || payload.id;
        const role = payload.app_metadata?.role || payload.role || 'user';
        const email = payload.email || null;

        return { userId, role, email };
    }
}
