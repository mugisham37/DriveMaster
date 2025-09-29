#!/usr/bin/env tsx

import {
  runMigrations,
  rollbackLastMigration,
  getMigrationStatus,
  createPartitions,
  optimizeDatabase,
  closeMigrationConnection,
} from '../db/migrate'
import { IndexManager, DatabaseMaintenance, DatabaseMonitor } from '../db/utils'
import { DatabaseOptimizer, ConnectionManager, HealthMonitor } from '../db/optimization'
import { DatabaseMonitoring, MaintenanceScheduler } from '../db/monitoring'

async function main() {
  const command = process.argv[2]

  try {
    switch (command) {
      case 'up':
      case 'migrate':
        console.log('Running database migrations...')
        await runMigrations()
        await createPartitions()
        await optimizeDatabase()
        break

      case 'down':
      case 'rollback':
        console.log('Rolling back last migration...')
        await rollbackLastMigration()
        break

      case 'status':
        console.log('Checking migration status...')
        const status = await getMigrationStatus()
        console.log('\n📊 Migration Status:')
        console.log(`Applied migrations: ${status.applied.length}`)
        console.log(`Pending migrations: ${status.pending.length}`)
        console.log(`Can rollback: ${status.canRollback ? 'Yes' : 'No'}`)

        if (status.applied.length > 0) {
          console.log('\n✅ Applied migrations:')
          status.applied.forEach((migration) => {
            console.log(`  - ${migration.hash} (${migration.appliedAt})`)
          })
        }

        if (status.pending.length > 0) {
          console.log('\n⏳ Pending migrations:')
          status.pending.forEach((migration) => {
            console.log(`  - ${migration}`)
          })
        }
        break

      case 'optimize':
        console.log('Optimizing database performance...')
        await optimizeDatabase()
        break

      case 'partitions':
        console.log('Creating database partitions...')
        await createPartitions()
        break

      case 'indexes':
        console.log('Creating optimized indexes...')
        await IndexManager.createGinIndexes()
        await IndexManager.createCompositeIndexes()
        break

      case 'maintenance':
        console.log('Running database maintenance...')
        await DatabaseMaintenance.vacuumAnalyze()
        break

      case 'monitor':
        console.log('Checking database performance...')
        const report = await DatabaseMonitoring.generateReport()
        console.log('\n📊 Database Monitoring Report:')
        console.log(report)
        break

      case 'health':
        console.log('Performing health check...')
        const health = await HealthMonitor.performHealthCheck()
        console.log(`\n🏥 Database Health: ${health.status.toUpperCase()}`)

        console.log('\n🔍 Health Checks:')
        Object.entries(health.checks).forEach(([check, result]) => {
          const status = result.status ? '✅' : '❌'
          const latency = result.latency ? ` (${result.latency}ms)` : ''
          console.log(`  ${status} ${check}${latency}`)
          if (result.error) console.log(`    Error: ${result.error}`)
        })

        console.log('\n📈 Key Metrics:')
        Object.entries(health.metrics).forEach(([metric, value]) => {
          console.log(`  ${metric}: ${value}`)
        })
        break

      case 'alerts':
        console.log('Checking database alerts...')
        const alerts = await DatabaseMonitoring.checkAlerts()

        if (alerts.critical.length > 0) {
          console.log('\n🚨 Critical Alerts:')
          alerts.critical.forEach((alert) => console.log(`  - ${alert.message}`))
        }

        if (alerts.warning.length > 0) {
          console.log('\n⚠️  Warning Alerts:')
          alerts.warning.forEach((alert) => console.log(`  - ${alert.message}`))
        }

        if (alerts.info.length > 0) {
          console.log('\nℹ️  Info Alerts:')
          alerts.info.forEach((alert) => console.log(`  - ${alert.message}`))
        }

        if (alerts.critical.length === 0 && alerts.warning.length === 0) {
          console.log('\n✅ No alerts detected - database is healthy')
        }
        break

      case 'materialized-views':
        console.log('Creating materialized views...')
        await DatabaseOptimizer.createMaterializedViews()
        await DatabaseOptimizer.setupMaterializedViewRefresh()
        break

      case 'advanced-indexes':
        console.log('Creating advanced indexes...')
        await DatabaseOptimizer.createAdvancedIndexes()
        break

      case 'pgbouncer-config':
        console.log('Generating PgBouncer configuration...')
        const pgbouncerConfig = ConnectionManager.getPgBouncerConfig()
        console.log('\n📄 PgBouncer Configuration:')
        console.log(pgbouncerConfig)
        break

      default:
        console.log(`
🗄️  DriveMaster Database Migration Tool

Usage: pnpm db:migrate <command>

Commands:
  up, migrate           Run pending migrations and optimize database
  down, rollback        Rollback the last migration
  status                Show migration status
  optimize              Optimize database performance
  partitions            Create database partitions
  indexes               Create optimized indexes (GIN, composite)
  advanced-indexes      Create advanced performance indexes
  materialized-views    Create materialized views for analytics
  maintenance           Run database maintenance (VACUUM ANALYZE)
  monitor               Show comprehensive database monitoring report
  health                Perform database health check
  alerts                Check database alerts and warnings
  pgbouncer-config      Generate PgBouncer configuration

Examples:
  pnpm db:migrate up
  pnpm db:migrate status
  pnpm db:migrate health
  pnpm db:migrate monitor
  pnpm db:migrate alerts
        `)
        process.exit(1)
    }

    console.log('\n🎉 Migration operation completed successfully!')
  } catch (error) {
    console.error('\n❌ Migration operation failed:', error)
    process.exit(1)
  } finally {
    await closeMigrationConnection()
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Migration interrupted, cleaning up...')
  await closeMigrationConnection()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n🛑 Migration terminated, cleaning up...')
  await closeMigrationConnection()
  process.exit(0)
})

main().catch(async (error) => {
  console.error('Fatal error:', error)
  await closeMigrationConnection()
  process.exit(1)
})
