"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchManager = exports.IndexManager = void 0;
exports.createElasticsearchConnection = createElasticsearchConnection;
exports.checkElasticsearchHealth = checkElasticsearchHealth;
const elasticsearch_1 = require("@elastic/elasticsearch");
function createElasticsearchConnection(config) {
    const client = new elasticsearch_1.Client({
        node: config.node,
        maxRetries: config.maxRetries,
        requestTimeout: config.requestTimeout,
        pingTimeout: config.pingTimeout,
        // Performance optimizations
        compression: true,
        // Connection pool settings
        resurrectStrategy: 'ping',
        // Sniffing disabled for development
        sniffOnStart: false,
        sniffInterval: false,
        sniffOnConnectionFault: false,
    });
    return {
        client,
        close: async () => {
            await client.close();
        },
    };
}
// Elasticsearch health check utility
async function checkElasticsearchHealth(client) {
    try {
        const response = await client.cluster.health();
        return response.status === 'green' || response.status === 'yellow';
    }
    catch (error) {
        console.error('Elasticsearch health check failed:', error);
        return false;
    }
}
// Index management utilities
class IndexManager {
    client;
    constructor(client) {
        this.client = client;
    }
    async createIndex(name, mapping, settings) {
        try {
            const exists = await this.client.indices.exists({ index: name });
            if (exists) {
                console.log(`Index ${name} already exists`);
                return true;
            }
            await this.client.indices.create({
                index: name,
                body: {
                    settings: settings || {
                        number_of_shards: 1,
                        number_of_replicas: 0,
                        'index.mapping.total_fields.limit': 2000,
                    },
                    mappings: mapping,
                },
            });
            console.log(`Index ${name} created successfully`);
            return true;
        }
        catch (error) {
            console.error(`Failed to create index ${name}:`, error);
            return false;
        }
    }
    async deleteIndex(name) {
        try {
            await this.client.indices.delete({ index: name });
            console.log(`Index ${name} deleted successfully`);
            return true;
        }
        catch (error) {
            console.error(`Failed to delete index ${name}:`, error);
            return false;
        }
    }
    async indexExists(name) {
        try {
            return await this.client.indices.exists({ index: name });
        }
        catch (error) {
            console.error(`Failed to check if index ${name} exists:`, error);
            return false;
        }
    }
}
exports.IndexManager = IndexManager;
// Search utilities
class SearchManager {
    client;
    constructor(client) {
        this.client = client;
    }
    async search(index, query) {
        try {
            const response = await this.client.search({
                index,
                body: query,
            });
            return response.hits.hits.map((hit) => ({
                ...hit._source,
                _id: hit._id,
                _score: hit._score,
            }));
        }
        catch (error) {
            console.error('Search error:', error);
            return [];
        }
    }
    async index(index, id, document) {
        try {
            await this.client.index({
                index,
                id,
                body: document,
                refresh: 'wait_for',
            });
            return true;
        }
        catch (error) {
            console.error('Indexing error:', error);
            return false;
        }
    }
    async bulkIndex(index, documents) {
        try {
            const body = documents.flatMap(({ id, document }) => [
                { index: { _index: index, _id: id } },
                document,
            ]);
            const response = await this.client.bulk({
                body,
                refresh: 'wait_for',
            });
            if (response.errors) {
                console.error('Bulk indexing errors:', response.items.filter((item) => item.index?.error));
                return false;
            }
            return true;
        }
        catch (error) {
            console.error('Bulk indexing error:', error);
            return false;
        }
    }
    async delete(index, id) {
        try {
            await this.client.delete({
                index,
                id,
                refresh: 'wait_for',
            });
            return true;
        }
        catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    }
}
exports.SearchManager = SearchManager;
//# sourceMappingURL=elasticsearch.js.map