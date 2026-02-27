import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { sendMorningBriefing, sendEveningSummary, processAbandonmentRecovery } from '@ebizmate/domain';
import { db, workspaces } from '@ebizmate/db';
import { eq, and, not } from 'drizzle-orm';

@Injectable()
export class ScheduledProcessor {
    private readonly logger = new Logger(ScheduledProcessor.name);

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
                await sendMorningBriefing(workspace.id);
            } catch (err) {
                this.logger.error(`Failed morning briefing for ${workspace.id}`, err);
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
                await sendEveningSummary(workspace.id);
            } catch (err) {
                this.logger.error(`Failed evening summary for ${workspace.id}`, err);
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
}

