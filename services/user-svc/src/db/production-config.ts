// Production database configuration and deployment utilities

export interface ProductionConfig {
  database: DatabaseConfig
  pooling: PoolingConfig
  replication: ReplicationConfig
  backup: BackupConfig
  monitoring: MonitoringConfig
  security: SecurityConfig
}

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl: {
    enabled: boolean
    ca?: string
    cert?: string
    key?: string
    rejectUnauthorized: boolean
  }
  connectionTimeout: number
  queryTimeout: number
  statementTimeout: number
}

export interface PoolingConfig {
  pgbouncer: {
    enabled: boolean
    host: string
    port: number
    poolMode: 'session' | 'transaction' | 'statement'
    maxClientConnections: number
    defaultPoolSize: number
    minPoolSize: number
    reservePoolSize: number
    maxDbConnections: number
  }
  application: {
    maxConnections: number
    idleTimeout: number
    connectionTimeout: number
  }
}

export interface ReplicationConfig {
  enabled: boolean
  readReplicas: Array<{
    host: string
    port: number
    lag_threshold_ms: number
    weight: number
  }>
  synchronousCommit: 'off' | 'local' | 'remote_write' | 'remote_apply'
  walLevel: 'minimal' | 'replica' | 'logical'
  maxWalSenders: number
  walKeepSegments: number
}

export interface BackupConfig {
  strategy: 'continuous' | 'scheduled' | 'hybrid'
  retention: {
    daily: number
    weekly: number
    monthly: number
    yearly: number
  }
  storage: {
    type: 's3' | 'gcs' | 'azure' | 'local'
    bucket?: string
    path: string
    encryption: boolean
  }
  pointInTimeRecovery: {
    enabled: boolean
    walArchiving: boolean
    archiveCommand: string
    restoreCommand: string
  }
}

export interface MonitoringConfig {
  prometheus: {
    enabled: boolean
    port: number
    metricsPath: string
  }
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    slowQueryThreshold: number
    logConnections: boolean
    logDisconnections: boolean
    logStatements: 'none' | 'ddl' | 'mod' | 'all'
  }
  alerts: {
    connectionUtilization: number
    cacheHitRatio: number
    replicationLag: number
    slowQueries: number
    diskUsage: number
  }
}

export interface SecurityConfig {
  authentication: {
    method: 'md5' | 'scram-sha-256' | 'cert'
    passwordEncryption: 'md5' | 'scram-sha-256'
  }
  authorization: {
    defaultPrivileges: boolean
    rowLevelSecurity: boolean
  }
  encryption: {
    atRest: boolean
    inTransit: boolean
    keyRotation: boolean
  }
  auditing: {
    enabled: boolean
    logLevel: 'none' | 'ddl' | 'write' | 'all'
    logConnections: boolean
    logDisconnections: boolean
  }
}

// Production configuration templates
export class ProductionConfigTemplates {
  // High-performance configuration for 100k+ concurrent users
  static getHighPerformanceConfig(): ProductionConfig {
    return {
      database: {
        host: process.env.DB_HOST ?? 'localhost',
        port: parseInt(process.env.DB_PORT ?? '5432'),
        database: process.env.DB_NAME ?? 'drivemaster_prod',
        username: process.env.DB_USER ?? 'drivemaster',
        password: process.env.DB_PASSWORD ?? '',
        ssl: {
          enabled: true,
          rejectUnauthorized: true,
        },
        connectionTimeout: 10000,
        queryTimeout: 30000,
        statementTimeout: 60000,
      },
      pooling: {
        pgbouncer: {
          enabled: true,
          host: process.env.PGBOUNCER_HOST ?? 'localhost',
          port: parseInt(process.env.PGBOUNCER_PORT ?? '6432'),
          poolMode: 'transaction',
          maxClientConnections: 1000,
          defaultPoolSize: 50,
          minPoolSize: 10,
          reservePoolSize: 10,
          maxDbConnections: 100,
        },
        application: {
          maxConnections: 50,
          idleTimeout: 30000,
          connectionTimeout: 10000,
        },
      },
      replication: {
        enabled: true,
        readReplicas: [
          {
            host: process.env.DB_READ_REPLICA_1_HOST ?? 'replica1.example.com',
            port: 5432,
            lag_threshold_ms: 5000,
            weight: 1,
          },
          {
            host: process.env.DB_READ_REPLICA_2_HOST ?? 'replica2.example.com',
            port: 5432,
            lag_threshold_ms: 5000,
            weight: 1,
          },
        ],
        synchronousCommit: 'remote_write',
        walLevel: 'replica',
        maxWalSenders: 5,
        walKeepSegments: 64,
      },
      backup: {
        strategy: 'hybrid',
        retention: {
          daily: 7,
          weekly: 4,
          monthly: 12,
          yearly: 3,
        },
        storage: {
          type: 's3',
          bucket: process.env.BACKUP_S3_BUCKET,
          path: '/database-backups',
          encryption: true,
        },
        pointInTimeRecovery: {
          enabled: true,
          walArchiving: true,
          archiveCommand: 'wal-g wal-push %p',
          restoreCommand: 'wal-g wal-fetch %f %p',
        },
      },
      monitoring: {
        prometheus: {
          enabled: true,
          port: 9187,
          metricsPath: '/metrics',
        },
        logging: {
          level: 'info',
          slowQueryThreshold: 1000,
          logConnections: true,
          logDisconnections: true,
          logStatements: 'mod',
        },
        alerts: {
          connectionUtilization: 80,
          cacheHitRatio: 95,
          replicationLag: 5000,
          slowQueries: 10,
          diskUsage: 85,
        },
      },
      security: {
        authentication: {
          method: 'scram-sha-256',
          passwordEncryption: 'scram-sha-256',
        },
        authorization: {
          defaultPrivileges: false,
          rowLevelSecurity: true,
        },
        encryption: {
          atRest: true,
          inTransit: true,
          keyRotation: true,
        },
        auditing: {
          enabled: true,
          logLevel: 'write',
          logConnections: true,
          logDisconnections: true,
        },
      },
    }
  }

  // Development configuration
  static getDevelopmentConfig(): ProductionConfig {
    const prodConfig = this.getHighPerformanceConfig()

    return {
      ...prodConfig,
      database: {
        ...prodConfig.database,
        host: 'localhost',
        database: 'drivemaster_dev',
        ssl: {
          enabled: false,
          rejectUnauthorized: false,
        },
      },
      pooling: {
        ...prodConfig.pooling,
        pgbouncer: {
          ...prodConfig.pooling.pgbouncer,
          enabled: false,
        },
        application: {
          maxConnections: 10,
          idleTimeout: 30000,
          connectionTimeout: 5000,
        },
      },
      replication: {
        ...prodConfig.replication,
        enabled: false,
        readReplicas: [],
      },
      monitoring: {
        ...prodConfig.monitoring,
        logging: {
          ...prodConfig.monitoring.logging,
          level: 'debug',
          logStatements: 'all',
        },
      },
      security: {
        ...prodConfig.security,
        encryption: {
          atRest: false,
          inTransit: false,
          keyRotation: false,
        },
        auditing: {
          enabled: false,
          logLevel: 'none',
          logConnections: false,
          logDisconnections: false,
        },
      },
    }
  }

  // Generate PostgreSQL configuration
  static generatePostgreSQLConfig(config: ProductionConfig): string {
    return `
# PostgreSQL Configuration for DriveMaster Platform
# Generated for high-performance production deployment

# Connection Settings
listen_addresses = '*'
port = ${config.database.port}
max_connections = ${config.pooling.pgbouncer.maxDbConnections}
superuser_reserved_connections = 3

# Memory Settings (adjust based on available RAM)
shared_buffers = 4GB                    # 25% of RAM
effective_cache_size = 12GB             # 75% of RAM
work_mem = 256MB                        # For complex queries
maintenance_work_mem = 1GB              # For maintenance operations
wal_buffers = 64MB                      # WAL buffer size

# Checkpoint Settings
checkpoint_completion_target = 0.9
checkpoint_timeout = 15min
max_wal_size = 4GB
min_wal_size = 1GB

# Query Planner Settings
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage
seq_page_cost = 1.0

# WAL and Replication Settings
wal_level = ${config.replication.walLevel}
${
  config.replication.enabled
    ? `
max_wal_senders = ${config.replication.maxWalSenders}
wal_keep_segments = ${config.replication.walKeepSegments}
synchronous_commit = ${config.replication.synchronousCommit}
`
    : ''
}

# Archive Settings
${
  config.backup.pointInTimeRecovery.enabled
    ? `
archive_mode = on
archive_command = '${config.backup.pointInTimeRecovery.archiveCommand}'
`
    : ''
}

# Logging Settings
logging_collector = on
log_destination = 'stderr'
log_directory = 'pg_log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_rotation_size = 100MB
log_min_duration_statement = ${config.monitoring.logging.slowQueryThreshold}ms
log_connections = ${config.monitoring.logging.logConnections ? 'on' : 'off'}
log_disconnections = ${config.monitoring.logging.logDisconnections ? 'on' : 'off'}
log_statement = '${config.monitoring.logging.logStatements}'
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '

# Performance Settings
shared_preload_libraries = 'pg_stat_statements'
track_activity_query_size = 2048
pg_stat_statements.track = all
pg_stat_statements.max = 10000

# Autovacuum Settings (tuned for high-traffic)
autovacuum = on
autovacuum_max_workers = 6
autovacuum_naptime = 15s
autovacuum_vacuum_threshold = 25
autovacuum_analyze_threshold = 10
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Lock Settings
deadlock_timeout = 1s
lock_timeout = 30s
statement_timeout = ${config.database.statementTimeout}ms

# Security Settings
${
  config.security.encryption.inTransit
    ? `
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_ca_file = 'ca.crt'
`
    : ''
}
password_encryption = ${config.security.authentication.passwordEncryption}

# Parallel Query Settings
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_worker_processes = 16

# JIT Settings (PostgreSQL 11+)
jit = on
jit_above_cost = 100000
jit_inline_above_cost = 500000
jit_optimize_above_cost = 500000
    `.trim()
  }

  // Generate PgBouncer configuration
  static generatePgBouncerConfig(config: ProductionConfig): string {
    const pgbouncer = config.pooling.pgbouncer

    return `
# PgBouncer Configuration for DriveMaster Platform

[databases]
${config.database.database} = host=${config.database.host} port=${config.database.port} dbname=${config.database.database} user=${config.database.username}

[pgbouncer]
# Connection pooling
pool_mode = ${pgbouncer.poolMode}
max_client_conn = ${pgbouncer.maxClientConnections}
default_pool_size = ${pgbouncer.defaultPoolSize}
min_pool_size = ${pgbouncer.minPoolSize}
reserve_pool_size = ${pgbouncer.reservePoolSize}
reserve_pool_timeout = 5
max_db_connections = ${pgbouncer.maxDbConnections}
max_user_connections = ${pgbouncer.maxDbConnections}

# Performance
server_round_robin = 1
ignore_startup_parameters = extra_float_digits

# Timeouts
server_lifetime = 3600
server_idle_timeout = 600
client_idle_timeout = 0
query_timeout = 0
query_wait_timeout = 120
client_login_timeout = 60
autodb_idle_timeout = 3600

# Logging
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1
syslog = 1
syslog_facility = daemon
syslog_ident = pgbouncer

# Security
auth_type = ${config.security.authentication.method}
auth_file = /etc/pgbouncer/userlist.txt

# Admin
admin_users = postgres, ${config.database.username}_admin
stats_users = postgres, ${config.database.username}_admin

# Listen
listen_addr = *
listen_port = ${pgbouncer.port}

# TLS (if enabled)
${
  config.security.encryption.inTransit
    ? `
server_tls_sslmode = require
server_tls_ca_file = /etc/ssl/certs/ca.crt
server_tls_cert_file = /etc/ssl/certs/server.crt
server_tls_key_file = /etc/ssl/private/server.key
`
    : ''
}
    `.trim()
  }

  // Generate monitoring configuration
  static generatePrometheusConfig(config: ProductionConfig): string {
    return `
# Prometheus PostgreSQL Exporter Configuration

global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "postgresql_rules.yml"

scrape_configs:
  - job_name: 'postgresql'
    static_configs:
      - targets: ['localhost:${config.monitoring.prometheus.port}']
    scrape_interval: 15s
    metrics_path: ${config.monitoring.prometheus.metricsPath}

  - job_name: 'pgbouncer'
    static_configs:
      - targets: ['localhost:9127']
    scrape_interval: 15s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

# Alert Rules
rule_files:
  - "alerts.yml"
    `.trim()
  }

  // Generate alert rules
  static generateAlertRules(config: ProductionConfig): string {
    return `
# PostgreSQL Alert Rules for DriveMaster Platform

groups:
  - name: postgresql
    rules:
      - alert: PostgreSQLDown
        expr: pg_up == 0
        for: 0m
        labels:
          severity: critical
        annotations:
          summary: PostgreSQL instance is down
          description: "PostgreSQL instance {{ $labels.instance }} is down"

      - alert: PostgreSQLHighConnections
        expr: (pg_stat_activity_count / pg_settings_max_connections) * 100 > ${config.monitoring.alerts.connectionUtilization}
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: PostgreSQL high connection utilization
          description: "PostgreSQL connection utilization is {{ $value }}%"

      - alert: PostgreSQLLowCacheHitRatio
        expr: pg_stat_database_blks_hit / (pg_stat_database_blks_hit + pg_stat_database_blks_read) * 100 < ${config.monitoring.alerts.cacheHitRatio}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: PostgreSQL low cache hit ratio
          description: "PostgreSQL cache hit ratio is {{ $value }}%"

      - alert: PostgreSQLReplicationLag
        expr: pg_replication_lag_seconds > ${config.monitoring.alerts.replicationLag / 1000}
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: PostgreSQL replication lag is high
          description: "PostgreSQL replication lag is {{ $value }} seconds"

      - alert: PostgreSQLSlowQueries
        expr: rate(pg_stat_statements_mean_time_ms[5m]) > ${config.monitoring.alerts.slowQueries}
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: PostgreSQL has slow queries
          description: "PostgreSQL average query time is {{ $value }}ms"

      - alert: PostgreSQLHighDiskUsage
        expr: (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"}) / node_filesystem_size_bytes{mountpoint="/"} * 100 > ${config.monitoring.alerts.diskUsage}
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: PostgreSQL high disk usage
          description: "PostgreSQL disk usage is {{ $value }}%"
    `.trim()
  }
}

// Deployment utilities
export class DeploymentUtils {
  // Generate complete deployment package
  static generateDeploymentPackage(environment: 'development' | 'production'): {
    postgresql_conf: string
    pgbouncer_ini: string
    prometheus_yml: string
    alerts_yml: string
    docker_compose: string
  } {
    const config =
      environment === 'production'
        ? ProductionConfigTemplates.getHighPerformanceConfig()
        : ProductionConfigTemplates.getDevelopmentConfig()

    return {
      postgresql_conf: ProductionConfigTemplates.generatePostgreSQLConfig(config),
      pgbouncer_ini: ProductionConfigTemplates.generatePgBouncerConfig(config),
      prometheus_yml: ProductionConfigTemplates.generatePrometheusConfig(config),
      alerts_yml: ProductionConfigTemplates.generateAlertRules(config),
      docker_compose: this.generateDockerCompose(config),
    }
  }

  // Generate Docker Compose configuration
  private static generateDockerCompose(config: ProductionConfig): string {
    return `
version: '3.8'

services:
  postgresql:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: ${config.database.database}
      POSTGRES_USER: ${config.database.username}
      POSTGRES_PASSWORD: ${config.database.password}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgresql.conf:/etc/postgresql/postgresql.conf
    ports:
      - "${config.database.port}:5432"
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${config.database.username}"]
      interval: 30s
      timeout: 10s
      retries: 3

  ${
    config.pooling.pgbouncer.enabled
      ? `
  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: postgresql
      DATABASES_PORT: ${config.database.port}
      DATABASES_USER: ${config.database.username}
      DATABASES_PASSWORD: ${config.database.password}
      DATABASES_DBNAME: ${config.database.database}
      POOL_MODE: ${config.pooling.pgbouncer.poolMode}
      MAX_CLIENT_CONN: ${config.pooling.pgbouncer.maxClientConnections}
      DEFAULT_POOL_SIZE: ${config.pooling.pgbouncer.defaultPoolSize}
    volumes:
      - ./pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
    ports:
      - "${config.pooling.pgbouncer.port}:6432"
    depends_on:
      - postgresql
  `
      : ''
  }

  ${
    config.monitoring.prometheus.enabled
      ? `
  postgres_exporter:
    image: prometheuscommunity/postgres-exporter
    environment:
      DATA_SOURCE_NAME: "postgresql://${config.database.username}:${config.database.password}@postgresql:${config.database.port}/${config.database.database}?sslmode=disable"
    ports:
      - "${config.monitoring.prometheus.port}:9187"
    depends_on:
      - postgresql

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alerts.yml:/etc/prometheus/alerts.yml
    ports:
      - "9090:9090"
    depends_on:
      - postgres_exporter

  grafana:
    image: grafana/grafana
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
  `
      : ''
  }

volumes:
  postgres_data:
  ${config.monitoring.prometheus.enabled ? 'grafana_data:' : ''}

networks:
  default:
    driver: bridge
    `.trim()
  }
}
