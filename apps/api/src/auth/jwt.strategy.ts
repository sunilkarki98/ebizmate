import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        super({
            // SEC-2 FIX: Only extract JWT from Authorization header.
            // URL query parameter extraction was removed because tokens in URLs
            // leak via server logs, Referer headers, and browser history.
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            // Dynamically select the secret based on the token issuer
            secretOrKeyProvider: (request, rawJwtToken, done) => {
                try {
                    const decoded = jwt.decode(rawJwtToken) as any;

                    if (!decoded) {
                        return done(new Error('Invalid token format'), null);
                    }

                    // Determine token origin by checking the issuer claim.
                    // Supabase tokens always have an `iss` containing the project URL.
                    const issuer = decoded.iss || '';
                    const isSupabaseToken = issuer.includes('supabase') || !!decoded.app_metadata;

                    if (isSupabaseToken) {
                        const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
                        if (!secret) {
                            return done(new Error('SUPABASE_JWT_SECRET is not configured'), null);
                        }
                        done(null, secret);
                    } else {
                        const nextAuthSecret = this.configService.get<string>('NEXTAUTH_SECRET');
                        if (!nextAuthSecret) {
                            return done(new Error('NEXTAUTH_SECRET environment variable is required for JWT authentication'), null);
                        }
                        done(null, nextAuthSecret);
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
        const name = payload.name || payload.user_metadata?.full_name || null;

        return { id: userId, sub: userId, userId, role, email, name };
    }
}
