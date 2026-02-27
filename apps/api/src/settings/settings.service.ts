import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as DomainSettingsService from '@ebizmate/domain';
import { UpdateIdentityDto, UpdateAiSettingsDto, UpdateProfileDto } from '@ebizmate/contracts';

@Injectable()
export class SettingsService {
    private readonly logger = new Logger(SettingsService.name);

    constructor(
        @InjectQueue('ai') private readonly aiQueue: Queue,
    ) { }

    private async handleDomainCall<T>(call: () => Promise<T>): Promise<T> {
        try {
            return await call();
        } catch (error: any) {
            if (error.message === 'Workspace not found') throw new NotFoundException(error.message);
            throw error;
        }
    }

    async getWorkspace(userId: string) {
        return this.handleDomainCall(() => DomainSettingsService.getWorkspace(userId));
    }

    async getWorkspaceDetailed(userId: string) {
        return this.handleDomainCall(() => DomainSettingsService.getWorkspaceDetailed(userId));
    }

    async updateIdentity(userId: string, dto: UpdateIdentityDto) {
        return this.handleDomainCall(() => DomainSettingsService.updateIdentity(userId, dto, this.aiQueue));
    }

    async updateProfile(userId: string, dto: UpdateProfileDto) {
        return this.handleDomainCall(() => DomainSettingsService.updateProfile(userId, dto));
    }

    async updateAiSettings(userId: string, dto: UpdateAiSettingsDto) {
        return this.handleDomainCall(() => DomainSettingsService.updateAiSettings(userId, dto));
    }
}
