import { z } from 'zod';
export declare const DatabaseConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
    database: z.ZodString;
    username: z.ZodString;
    password: z.ZodString;
    ssl: z.ZodDefault<z.ZodBoolean>;
    maxConnections: z.ZodDefault<z.ZodNumber>;
    idleTimeoutMs: z.ZodDefault<z.ZodNumber>;
    connectionTimeoutMs: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    host: string;
    password: string;
    port: number;
    database: string;
    username: string;
    ssl: boolean;
    maxConnections: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
}, {
    password: string;
    database: string;
    username: string;
    host?: string | undefined;
    port?: number | undefined;
    ssl?: boolean | undefined;
    maxConnections?: number | undefined;
    idleTimeoutMs?: number | undefined;
    connectionTimeoutMs?: number | undefined;
}>;
export declare const RedisConfigSchema: z.ZodObject<{
    host: z.ZodDefault<z.ZodString>;
    port: z.ZodDefault<z.ZodNumber>;
    password: z.ZodOptional<z.ZodString>;
    db: z.ZodDefault<z.ZodNumber>;
    maxRetriesPerRequest: z.ZodDefault<z.ZodNumber>;
    retryDelayOnFailover: z.ZodDefault<z.ZodNumber>;
    enableReadyCheck: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    host: string;
    port: number;
    db: number;
    maxRetriesPerRequest: number;
    retryDelayOnFailover: number;
    enableReadyCheck: boolean;
    password?: string | undefined;
}, {
    host?: string | undefined;
    password?: string | undefined;
    port?: number | undefined;
    db?: number | undefined;
    maxRetriesPerRequest?: number | undefined;
    retryDelayOnFailover?: number | undefined;
    enableReadyCheck?: boolean | undefined;
}>;
export declare const KafkaConfigSchema: z.ZodObject<{
    brokers: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    clientId: z.ZodString;
    groupId: z.ZodString;
    connectionTimeout: z.ZodDefault<z.ZodNumber>;
    requestTimeout: z.ZodDefault<z.ZodNumber>;
    retry: z.ZodDefault<z.ZodObject<{
        initialRetryTime: z.ZodDefault<z.ZodNumber>;
        retries: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        initialRetryTime: number;
        retries: number;
    }, {
        initialRetryTime?: number | undefined;
        retries?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    connectionTimeout: number;
    brokers: string[];
    clientId: string;
    groupId: string;
    requestTimeout: number;
    retry: {
        initialRetryTime: number;
        retries: number;
    };
}, {
    clientId: string;
    groupId: string;
    connectionTimeout?: number | undefined;
    brokers?: string[] | undefined;
    requestTimeout?: number | undefined;
    retry?: {
        initialRetryTime?: number | undefined;
        retries?: number | undefined;
    } | undefined;
}>;
export declare const ElasticsearchConfigSchema: z.ZodObject<{
    node: z.ZodDefault<z.ZodString>;
    maxRetries: z.ZodDefault<z.ZodNumber>;
    requestTimeout: z.ZodDefault<z.ZodNumber>;
    pingTimeout: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    requestTimeout: number;
    node: string;
    maxRetries: number;
    pingTimeout: number;
}, {
    requestTimeout?: number | undefined;
    node?: string | undefined;
    maxRetries?: number | undefined;
    pingTimeout?: number | undefined;
}>;
export declare const ServiceConfigSchema: z.ZodObject<{
    name: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    port: z.ZodNumber;
    host: z.ZodDefault<z.ZodString>;
    environment: z.ZodDefault<z.ZodEnum<["development", "staging", "production"]>>;
    logLevel: z.ZodDefault<z.ZodEnum<["error", "warn", "info", "debug"]>>;
    cors: z.ZodDefault<z.ZodObject<{
        origin: z.ZodDefault<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">, z.ZodBoolean]>>;
        credentials: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        origin: string | boolean | string[];
        credentials: boolean;
    }, {
        origin?: string | boolean | string[] | undefined;
        credentials?: boolean | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    logLevel: "error" | "warn" | "info" | "debug";
    version: string;
    host: string;
    name: string;
    port: number;
    environment: "development" | "staging" | "production";
    cors: {
        origin: string | boolean | string[];
        credentials: boolean;
    };
}, {
    name: string;
    port: number;
    logLevel?: "error" | "warn" | "info" | "debug" | undefined;
    version?: string | undefined;
    host?: string | undefined;
    environment?: "development" | "staging" | "production" | undefined;
    cors?: {
        origin?: string | boolean | string[] | undefined;
        credentials?: boolean | undefined;
    } | undefined;
}>;
export type DatabaseConfig = z.infer<typeof DatabaseConfigSchema>;
export type RedisConfig = z.infer<typeof RedisConfigSchema>;
export type KafkaConfig = z.infer<typeof KafkaConfigSchema>;
export type ElasticsearchConfig = z.infer<typeof ElasticsearchConfigSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;
export declare function loadEnvironmentConfig(): {
    database: DatabaseConfig;
    redis: RedisConfig;
    kafka: KafkaConfig;
    elasticsearch: ElasticsearchConfig;
    service: ServiceConfig;
};
//# sourceMappingURL=environment.d.ts.map