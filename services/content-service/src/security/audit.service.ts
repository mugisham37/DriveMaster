import { Injectable } from '@nestjs/common';

export interface AuditLogEntry {
    id?: string;
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    details?: any;
    ipAddress?: string;
    userAgent?: string;
    timestamp: Date;
    success: boolean;
    errorMessage?: string;
}

export interface AuditQuery {
    userId?: string;
    action?: string;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
}

@Injectable()
export class AuditService {
    private auditLogs: AuditLogEntry[] = []; // In production, this would be a database

    /**
     * Log an audit event
     */
    async logEvent(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
        const auditEntry: AuditLogEntry = {
            id: this.generateId(),
            timestamp: new Date(),
            ...entry
        };

        // In production, save to database
        this.auditLogs.push(auditEntry);
        
        // Also log to console for development
        console.log('Audit Event:', JSON.stringify(auditEntry, null, 2));
    }

    /**
     * Log successful action
     */
    async logSuccess(
        action: string,
        resource: string,
        userId?: string,
        resourceId?: string,
        details?: any,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.logEvent({
            userId,
            action,
            resource,
            resourceId,
            details,
            ipAddress,
            userAgent,
            success: true
        });
    }

    /**
     * Log failed action
     */
    async logFailure(
        action: string,
        resource: string,
        errorMessage: string,
        userId?: string,
        resourceId?: string,
        details?: any,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        await this.logEvent({
            userId,
            action,
            resource,
            resourceId,
            details,
            ipAddress,
            userAgent,
            success: false,
            errorMessage
        });
    }

    /**
     * Query audit logs
     */
    async queryLogs(query: AuditQuery): Promise<{ logs: AuditLogEntry[]; total: number }> {
        let filteredLogs = [...this.auditLogs];

        // Apply filters
        if (query.userId) {
            filteredLogs = filteredLogs.filter(log => log.userId === query.userId);
        }

        if (query.action) {
            filteredLogs = filteredLogs.filter(log => log.action === query.action);
        }

        if (query.resource) {
            filteredLogs = filteredLogs.filter(log => log.resource === query.resource);
        }

        if (query.success !== undefined) {
            filteredLogs = filteredLogs.filter(log => log.success === query.success);
        }

        if (query.startDate) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= query.startDate!);
        }

        if (query.endDate) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= query.endDate!);
        }

        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        const total = filteredLogs.length;

        // Apply pagination
        const offset = query.offset || 0;
        const limit = query.limit || 100;
        const paginatedLogs = filteredLogs.slice(offset, offset + limit);

        return {
            logs: paginatedLogs,
            total
        };
    }

    /**
     * Get audit statistics
     */
    async getStatistics(startDate?: Date, endDate?: Date): Promise<{
        totalEvents: number;
        successfulEvents: number;
        failedEvents: number;
        topActions: { action: string; count: number }[];
        topResources: { resource: string; count: number }[];
        topUsers: { userId: string; count: number }[];
    }> {
        let logs = [...this.auditLogs];

        if (startDate) {
            logs = logs.filter(log => log.timestamp >= startDate);
        }

        if (endDate) {
            logs = logs.filter(log => log.timestamp <= endDate);
        }

        const totalEvents = logs.length;
        const successfulEvents = logs.filter(log => log.success).length;
        const failedEvents = logs.filter(log => !log.success).length;

        // Count actions
        const actionCounts = new Map<string, number>();
        logs.forEach(log => {
            actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
        });

        // Count resources
        const resourceCounts = new Map<string, number>();
        logs.forEach(log => {
            resourceCounts.set(log.resource, (resourceCounts.get(log.resource) || 0) + 1);
        });

        // Count users
        const userCounts = new Map<string, number>();
        logs.forEach(log => {
            if (log.userId) {
                userCounts.set(log.userId, (userCounts.get(log.userId) || 0) + 1);
            }
        });

        return {
            totalEvents,
            successfulEvents,
            failedEvents,
            topActions: Array.from(actionCounts.entries())
                .map(([action, count]) => ({ action, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10),
            topResources: Array.from(resourceCounts.entries())
                .map(([resource, count]) => ({ resource, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10),
            topUsers: Array.from(userCounts.entries())
                .map(([userId, count]) => ({ userId, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10)
        };
    }

    /**
     * Clear old audit logs (for maintenance)
     */
    async clearOldLogs(olderThanDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const initialCount = this.auditLogs.length;
        this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);
        const removedCount = initialCount - this.auditLogs.length;

        console.log(`Cleared ${removedCount} audit logs older than ${olderThanDays} days`);
        return removedCount;
    }

    private generateId(): string {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }
}