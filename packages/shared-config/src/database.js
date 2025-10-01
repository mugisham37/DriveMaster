'use strict'
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod }
  }
Object.defineProperty(exports, '__esModule', { value: true })
exports.createDatabaseConnection = createDatabaseConnection
exports.checkDatabaseHealth = checkDatabaseHealth
exports.runMigrations = runMigrations
const postgres_js_1 = require('drizzle-orm/postgres-js')
const postgres_1 = __importDefault(require('postgres'))
function createDatabaseConnection(config) {
  const connectionString = `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`
  const client = (0, postgres_1.default)(connectionString, {
    max: config.maxConnections,
    idle_timeout: config.idleTimeoutMs / 1000,
    connect_timeout: config.connectionTimeoutMs / 1000,
    ssl: config.ssl ? 'require' : false,
    transform: {
      undefined: null,
    },
    types: {
      bigint: postgres_1.default.BigInt,
    },
  })
  const db = (0, postgres_js_1.drizzle)(client, {
    logger: process.env.NODE_ENV === 'development',
  })
  return {
    db,
    client,
    close: async () => {
      await client.end()
    },
  }
}
// Database health check utility
async function checkDatabaseHealth(client) {
  try {
    await client`SELECT 1`
    return true
  } catch (error) {
    console.error('Database health check failed:', error)
    return false
  }
}
async function runMigrations(client, config) {
  // This will be implemented with drizzle-kit
  console.log('Running migrations from:', config.migrationsFolder)
  // Implementation will be added when setting up individual services
}
//# sourceMappingURL=database.js.map
