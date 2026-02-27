import { Injectable } from '@nestjs/common';
import { CustomerDomain, getInboxCustomers, archiveCustomer, sendInboxMessage } from '@ebizmate/domain';

@Injectable()
export class InboxService {
    async getCustomers(userId: string) {
        return getInboxCustomers(userId);
    }

    async getConversation(userId: string, platformId: string) {
        return CustomerDomain.getConversation(userId, platformId);
    }

    async archiveCustomer(userId: string, customerId: string) {
        return archiveCustomer(userId, customerId);
    }

    async pauseAi(userId: string, customerId: string) {
        return CustomerDomain.pauseAi(userId, customerId);
    }

    async resumeAi(userId: string, customerId: string) {
        return CustomerDomain.resumeAi(userId, customerId);
    }

    async sendMessage(userId: string, customerId: string, text: string) {
        return sendInboxMessage(userId, customerId, text);
    }
}
