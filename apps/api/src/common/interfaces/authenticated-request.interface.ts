import { Request } from 'express';

export interface JwtPayload {
    userId: string;
    role: string;
}

export interface AuthenticatedRequest extends Request {
    user: JwtPayload;
}
