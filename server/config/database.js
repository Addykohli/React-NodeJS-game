const { Sequelize } = require('sequelize');
require('dotenv').config();

// Log the DATABASE_URL (but mask sensitive information)
const maskDatabaseUrl = (url) => {
  if (!url) return 'DATABASE_URL is not set';
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.username}:****@${parsedUrl.host}${parsedUrl.pathname}`;
  } catch (e) {
    return 'Invalid DATABASE_URL format';
  }
};

console.log('Attempting to connect to database with URL:', maskDatabaseUrl(process.env.DATABASE_URL));

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
      /SequelizeConnectionAcquireTimeoutError/
    ],
    max: 3
  }
});

// Test the connection
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connection established successfully.');
  })
  .catch(err => {
    console.error('❌ Unable to connect to the database:', err);
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      original: err.original
    });
    // Additional helpful information
    console.error('Connection configuration:', {
      dialect: sequelize.options.dialect,
      host: sequelize.config.host,
      port: sequelize.config.port,
      database: sequelize.config.database,
      username: sequelize.config.username,
      ssl: sequelize.options.dialectOptions.ssl
    });
  });

module.exports = sequelize; 