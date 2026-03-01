import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sendMorningBriefing, sendEveningSummary, processAbandonmentRecovery, resetMonthlyTokenUsage } from '@ebizmate/domain';
import { db, workspaces } from '@ebizmate/db';
import { eq, and, not } from 'drizzle-orm';
import { InjectQueue, Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';

@Injectable()
export class ScheduledProcessor {
    private readonly logger = new Logger(ScheduledProcessor.name);

    constructor(
        @InjectQueue('scheduled') private readonly scheduledQueue: Queue,
    ) { }

    // Runs every day at 8:00 AM
    @Cron('0 8 * * *', {
        name: 'morning_briefing',
        timeZone: 'UTC' // In a real app, you would localize this per-workspace
    })
    async handleMorningBriefing() {
        this.logger.log('Triggering daily morning briefings...');

        // Fetch all active workspaces that have AI enabled
        // M-1 FIX: Also filter out suspended workspaces
        const activeWorkspaces = await db.query.workspaces.findMany({
            where: and(
                eq(workspaces.aiBlocked, false),
                not(eq(workspaces.status, 'suspended'))
            )
        });

        for (const workspace of activeWorkspaces) {
            try {
                // M-2 FIX: Dispatch to queue instead of running synchronously
                await this.scheduledQueue.add('morning_briefing', { workspaceId: workspace.id });
            } catch (err) {
                this.logger.error(`Failed to queue morning briefing for ${workspace.id}`, err);
            }
        }
    }

    // Runs every day at 7:00 PM (19:00)
    @Cron('0 19 * * *', {
        name: 'evening_summary',
        timeZone: 'UTC'
    })
    async handleEveningSummary() {
        this.logger.log('Triggering daily evening summaries...');

        // M-1 FIX: Also filter out suspended workspaces
        const activeWorkspaces = await db.query.workspaces.findMany({
            where: and(
                eq(workspaces.aiBlocked, false),
                not(eq(workspaces.status, 'suspended'))
            )
        });

        for (const workspace of activeWorkspaces) {
            try {
                // M-2 FIX: Dispatch to queue instead of running synchronously
                await this.scheduledQueue.add('evening_summary', { workspaceId: workspace.id });
            } catch (err) {
                this.logger.error(`Failed to queue evening summary for ${workspace.id}`, err);
            }
        }
    }

    // FIX #6: Concurrency guard
    private isRecoveryRunning = false;

    // Runs every 1 minute for ultra-fast browse abandonment recovery
    @Cron(CronExpression.EVERY_MINUTE, {
        name: 'abandonment_recovery'
    })
    async handleAbandonmentRecovery() {
        if (this.isRecoveryRunning) {
            this.logger.warn('Abandonment recovery is already running, skipping this minute.');
            return;
        }
        this.isRecoveryRunning = true;
        this.logger.log('Triggering fast browse abandonment recovery check...');
        try {
            await processAbandonmentRecovery();
        } catch (err) {
            this.logger.error('Failed abandonment recovery run:', err);
        } finally {
            this.isRecoveryRunning = false;
        }
    }

    // Runs on the 1st day of every month at midnight
    @Cron('0 0 1 * *', {
        name: 'monthly_token_reset',
        timeZone: 'UTC'
    })
    async handleMonthlyTokenReset() {
        this.logger.log('Triggering monthly token reset for all workspaces...');
        try {
            await this.scheduledQueue.add('monthly_token_reset', {});
        } catch (err) {
            this.logger.error('Failed to queue monthly token reset', err);
        }
    }
}

@Processor('scheduled', { concurrency: 20 })
export class ScheduledWorker extends WorkerHost {
    private readonly logger = new Logger(ScheduledWorker.name);

    async process(job: Job<any, any, string>): Promise<any> {
        const { name, data } = job;
        switch (name) {
            case 'morning_briefing':
                await sendMorningBriefing(data.workspaceId);
                return { success: true };
            case 'evening_summary':
                await sendEveningSummary(data.workspaceId);
                return { success: true };
            case 'monthly_token_reset':
                await resetMonthlyTokenUsage();
                return { success: true };
            default:
                throw new Error(`Unknown scheduled job type: ${name}`);
        }
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error) {
        this.logger.error(`🚨 [BullMQ] Scheduled Job ${job.id} (${job.name}) failed:`, error.message);
    }
}

