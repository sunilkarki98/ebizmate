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
            // SEC-3 FIX: Never use jwt.decode() to determine execution paths,
            // as it trusts unverified, user-provided data. Instead, we cryptographically
            // prove the signature against our known secrets.
            secretOrKeyProvider: (request, rawJwtToken, done) => {
                const supabaseSecret = this.configService.get<string>('SUPABASE_JWT_SECRET');
                const nextAuthSecret = this.configService.get<string>('NEXTAUTH_SECRET');

                let validSecret: string | null = null;

                // Try Supabase secret first
                if (supabaseSecret) {
                    try {
                        // ignoreExpiration: true is strictly used here to allow the passport-jwt 
                        // framework to handle the actual expiration check and throw the correct 
                        // 'Unauthorized' error later. We only care about proving the signature here.
                        jwt.verify(rawJwtToken, supabaseSecret, { ignoreExpiration: true });
                        validSecret = supabaseSecret;
                    } catch (e) {
                        // Signature invalid for Supabase
                    }
                }

                // If Supabase failed, try NextAuth
                if (!validSecret && nextAuthSecret) {
                    try {
                        jwt.verify(rawJwtToken, nextAuthSecret, { ignoreExpiration: true });
                        validSecret = nextAuthSecret;
                    } catch (e) {
                        // Signature invalid for NextAuth
                    }
                }

                if (validSecret) {
                    done(null, validSecret);
                } else {
                    done(new Error('Invalid token signature or missing secret configuration'), null);
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
