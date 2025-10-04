import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { SearchService } from './search.service';
import { Item, ItemStatus } from '../content/entities/item.entity';

@Injectable()
export class SearchIntegrationService {
    private readonly logger = new Logger(SearchIntegrationService.name);

    constructor(
        @Inject(forwardRef(() => SearchService))
        private readonly searchService: SearchService,
    ) { }

    /**
     * Handle item creation - index if published
     */
    async handleItemCreated(item: Item): Promise<void> {
        try {
            if (item.status === ItemStatus.PUBLISHED && item.isActive) {
                await this.searchService.indexItem(item);
                this.logger.debug(`Indexed newly created item: ${item.id}`);
            }
        } catch (error) {
            this.logger.error(`Failed to index created item ${item.id}:`, error);
            // Don't throw - indexing failures shouldn't break content operations
        }
    }

    /**
     * Handle item updates - reindex if published, remove if unpublished
     */
    async handleItemUpdated(item: Item, previousStatus?: ItemStatus): Promise<void> {
        try {
            const shouldBeIndexed = item.status === ItemStatus.PUBLISHED && item.isActive;
            const wasIndexed = previousStatus === ItemStatus.PUBLISHED;

            if (shouldBeIndexed) {
                // Item should be in index - add or update
                await this.searchService.indexItem(item);
                this.logger.debug(`Reindexed updated item: ${item.id}`);
            } else if (wasIndexed && !shouldBeIndexed) {
                // Item was indexed but shouldn't be anymore - remove
                await this.searchService.removeItem(item.id);
                this.logger.debug(`Removed item from index: ${item.id}`);
            }
        } catch (error) {
            this.logger.error(`Failed to handle item update for ${item.id}:`, error);
            // Don't throw - indexing failures shouldn't break content operations
        }
    }

    /**
     * Handle item deletion - remove from index
     */
    async handleItemDeleted(itemId: string): Promise<void> {
        try {
            await this.searchService.removeItem(itemId);
            this.logger.debug(`Removed deleted item from index: ${itemId}`);
        } catch (error) {
            this.logger.error(`Failed to remove deleted item ${itemId} from index:`, error);
            // Don't throw - indexing failures shouldn't break content operations
        }
    }

    /**
     * Handle item publication - add to index
     */
    async handleItemPublished(item: Item): Promise<void> {
        try {
            if (item.isActive) {
                await this.searchService.indexItem(item);
                this.logger.debug(`Indexed published item: ${item.id}`);
            }
        } catch (error) {
            this.logger.error(`Failed to index published item ${item.id}:`, error);
            // Don't throw - indexing failures shouldn't break content operations
        }
    }

    /**
     * Handle item archival - remove from index
     */
    async handleItemArchived(itemId: string): Promise<void> {
        try {
            await this.searchService.removeItem(itemId);
            this.logger.debug(`Removed archived item from index: ${itemId}`);
        } catch (error) {
            this.logger.error(`Failed to remove archived item ${itemId} from index:`, error);
            // Don't throw - indexing failures shouldn't break content operations
        }
    }

    /**
     * Bulk reindex items
     */
    async bulkReindexItems(items: Item[]): Promise<void> {
        try {
            const publishedItems = items.filter(
                item => item.status === ItemStatus.PUBLISHED && item.isActive
            );

            if (publishedItems.length > 0) {
                await this.searchService.bulkIndexItems(publishedItems);
                this.logger.log(`Bulk reindexed ${publishedItems.length} items`);
            }
        } catch (error) {
            this.logger.error('Bulk reindexing failed:', error);
            throw error;
        }
    }
}