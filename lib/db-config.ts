export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'truefi_app_data',
  username: process.env.DB_USER || 'truefi_user',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.ENVIRONMENT === 'production' ? { rejectUnauthorized: false } : false,
  pool: {
    min: parseInt(process.env.DB_POOL_SIZE || '10'),
    max: parseInt(process.env.DB_MAX_OVERFLOW || '20'),
    acquireTimeoutMillis: parseInt(process.env.DB_POOL_TIMEOUT || '30000'),
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 200,
  },
}; 