import { Test, TestingModule } from '@nestjs/testing';
import { AuthSyncService } from './auth-sync.service';
import { AuthDomain } from '@ebizmate/domain';

// ---------------------------------------------------------------------------
// Mock the domain layer — prevents real DB calls
// ---------------------------------------------------------------------------
jest.mock('@ebizmate/domain', () => ({
    AuthDomain: {
        syncUser: jest.fn(),
    },
}));

const mockedSyncUser = AuthDomain.syncUser as jest.MockedFunction<typeof AuthDomain.syncUser>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthSyncService', () => {
    let service: AuthSyncService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [AuthSyncService],
        }).compile();

        service = module.get<AuthSyncService>(AuthSyncService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // -----------------------------------------------------------------------
    // New user — first signup
    // -----------------------------------------------------------------------
    describe('syncUser — new user', () => {
        it('should delegate to AuthDomain.syncUser and return result', async () => {
            const expected = { success: true, message: 'User synced successfully', isNewUser: true };
            mockedSyncUser.mockResolvedValue(expected);

            const result = await service.syncUser(
                'user-uuid-1',
                'alice@acme.com',
                'Alice',
                'https://avatar.url/alice.png',
            );

            expect(mockedSyncUser).toHaveBeenCalledTimes(1);
            expect(mockedSyncUser).toHaveBeenCalledWith(
                'user-uuid-1',
                'alice@acme.com',
                'Alice',
                'https://avatar.url/alice.png',
            );
            expect(result).toEqual(expected);
            expect(result.isNewUser).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // Existing user — idempotent re-sync
    // -----------------------------------------------------------------------
    describe('syncUser — existing user', () => {
        it('should return isNewUser:false for existing users', async () => {
            const expected = { success: true, message: 'User already exists', isNewUser: false };
            mockedSyncUser.mockResolvedValue(expected);

            const result = await service.syncUser('existing-id', 'bob@test.com', 'Bob');

            expect(mockedSyncUser).toHaveBeenCalledWith('existing-id', 'bob@test.com', 'Bob', undefined);
            expect(result.isNewUser).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // Optional image parameter
    // -----------------------------------------------------------------------
    describe('syncUser — optional image', () => {
        it('should pass image when provided', async () => {
            mockedSyncUser.mockResolvedValue({ success: true, message: 'User synced successfully', isNewUser: true });

            await service.syncUser('id-1', 'a@b.com', 'A', 'https://img.com/photo.jpg');

            expect(mockedSyncUser).toHaveBeenCalledWith('id-1', 'a@b.com', 'A', 'https://img.com/photo.jpg');
        });

        it('should pass undefined when image is omitted', async () => {
            mockedSyncUser.mockResolvedValue({ success: true, message: 'User already exists', isNewUser: false });

            await service.syncUser('id-2', 'b@c.com', 'B');

            expect(mockedSyncUser).toHaveBeenCalledWith('id-2', 'b@c.com', 'B', undefined);
        });
    });

    // -----------------------------------------------------------------------
    // Idempotency — calling twice gives the same result
    // -----------------------------------------------------------------------
    describe('idempotency', () => {
        it('should handle multiple calls for the same userId without error', async () => {
            mockedSyncUser
                .mockResolvedValueOnce({ success: true, message: 'User synced successfully', isNewUser: true })
                .mockResolvedValueOnce({ success: true, message: 'User already exists', isNewUser: false });

            const first = await service.syncUser('same-id', 'x@y.com', 'X');
            const second = await service.syncUser('same-id', 'x@y.com', 'X');

            expect(first.isNewUser).toBe(true);
            expect(second.isNewUser).toBe(false);
            expect(mockedSyncUser).toHaveBeenCalledTimes(2);
        });
    });

    // -----------------------------------------------------------------------
    // Error handling — domain layer throws
    // -----------------------------------------------------------------------
    describe('error handling', () => {
        it('should wrap domain errors in a user-friendly message', async () => {
            mockedSyncUser.mockRejectedValue(new Error('DB connection refused'));

            await expect(
                service.syncUser('fail-id', 'fail@test.com', 'Fail'),
            ).rejects.toThrow('Failed to sync user profile');

            // Ensure it does not leak the original DB error message
        });

        it('should not leak internal error details', async () => {
            mockedSyncUser.mockRejectedValue(
                new Error('insert or update on table "workspaces" violates foreign key constraint'),
            );

            try {
                await service.syncUser('bad-id', 'bad@test.com', 'Bad');
                fail('Expected an error to be thrown');
            } catch (err) {
                expect((err as Error).message).toBe('Failed to sync user profile');
                expect((err as Error).message).not.toContain('foreign key');
            }
        });
    });
});
