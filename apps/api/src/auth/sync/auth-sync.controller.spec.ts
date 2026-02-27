import { Test, TestingModule } from '@nestjs/testing';
import { AuthSyncController } from './auth-sync.controller';
import { AuthSyncService } from './auth-sync.service';
import { JwtAuthGuard } from '../jwt-auth.guard';
import type { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockAuthSyncService = {
    syncUser: jest.fn(),
};

// Bypass the JWT guard in unit tests
const mockJwtAuthGuard = { canActivate: jest.fn(() => true) };

// Helper to build a fake authenticated request
function fakeReq(overrides: Partial<{ sub: string; userId: string; email: string }>): AuthenticatedRequest {
    return {
        user: {
            sub: overrides.sub ?? 'user-123',
            userId: overrides.userId ?? 'user-123',
            email: overrides.email ?? 'test@example.com',
        },
    } as AuthenticatedRequest;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthSyncController', () => {
    let controller: AuthSyncController;
    let service: typeof mockAuthSyncService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthSyncController],
            providers: [
                { provide: AuthSyncService, useValue: mockAuthSyncService },
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue(mockJwtAuthGuard)
            .compile();

        controller = module.get<AuthSyncController>(AuthSyncController);
        service = mockAuthSyncService;
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    // -----------------------------------------------------------------------
    // Happy path — new user
    // -----------------------------------------------------------------------
    describe('syncProfile — new user', () => {
        it('should pass userId from JWT and body fields to service.syncUser', async () => {
            service.syncUser.mockResolvedValue({
                success: true,
                message: 'User synced successfully',
                isNewUser: true,
            });

            const req = fakeReq({ sub: 'supabase-uuid-1' });
            const body = { email: 'alice@acme.com', name: 'Alice', image: 'https://avatar.url/alice.png' };

            const result = await controller.syncProfile(req, body as any);

            expect(service.syncUser).toHaveBeenCalledTimes(1);
            expect(service.syncUser).toHaveBeenCalledWith(
                'supabase-uuid-1',   // userId from JWT
                'alice@acme.com',     // email from body
                'Alice',              // name from body
                'https://avatar.url/alice.png', // image from body
            );
            expect(result).toEqual({
                success: true,
                message: 'User synced successfully',
                isNewUser: true,
            });
        });
    });

    // -----------------------------------------------------------------------
    // Happy path — existing user (idempotent)
    // -----------------------------------------------------------------------
    describe('syncProfile — existing user', () => {
        it('should return isNewUser:false when user already exists', async () => {
            service.syncUser.mockResolvedValue({
                success: true,
                message: 'User already exists',
                isNewUser: false,
            });

            const req = fakeReq({ sub: 'existing-user-id' });
            const body = { email: 'bob@acme.com', name: 'Bob' };

            const result = await controller.syncProfile(req, body as any);

            expect(service.syncUser).toHaveBeenCalledWith(
                'existing-user-id',
                'bob@acme.com',
                'Bob',
                undefined, // no image
            );
            expect(result.isNewUser).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // userId resolution — sub vs userId fallback
    // -----------------------------------------------------------------------
    describe('userId resolution', () => {
        it('should prefer req.user.sub over req.user.userId', async () => {
            service.syncUser.mockResolvedValue({ success: true, isNewUser: true });

            const req = {
                user: { sub: 'sub-value', userId: 'userid-value', email: 'x@y.com' },
            } as AuthenticatedRequest;
            const body = { email: 'x@y.com', name: 'Test' };

            await controller.syncProfile(req, body as any);

            expect(service.syncUser).toHaveBeenCalledWith('sub-value', 'x@y.com', 'Test', undefined);
        });

        it('should fall back to req.user.userId when sub is falsy', async () => {
            service.syncUser.mockResolvedValue({ success: true, isNewUser: true });

            const req = {
                user: { sub: '', userId: 'fallback-id', email: 'x@y.com' },
            } as AuthenticatedRequest;
            const body = { email: 'x@y.com', name: 'Test' };

            await controller.syncProfile(req, body as any);

            expect(service.syncUser).toHaveBeenCalledWith('fallback-id', 'x@y.com', 'Test', undefined);
        });
    });

    // -----------------------------------------------------------------------
    // Error propagation
    // -----------------------------------------------------------------------
    describe('error propagation', () => {
        it('should propagate errors from service', async () => {
            service.syncUser.mockRejectedValue(new Error('Failed to sync user profile'));

            const req = fakeReq({});
            const body = { email: 'fail@test.com', name: 'Fail' };

            await expect(controller.syncProfile(req, body as any)).rejects.toThrow(
                'Failed to sync user profile',
            );
        });
    });
});
