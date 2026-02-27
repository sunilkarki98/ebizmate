import { Request } from 'express';

export interface JwtPayload {
    userId: string;
    sub: string;
    role: string;
    email?: string;
    name?: string;
}

export interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}
