const { Sequelize } = require('sequelize');
require('dotenv').config();

const validateDatabaseUrl = (url) => {
  if (!url) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.replace(/^\//, '');
    const cleanDbName = pathname.replace(/\//g, '_');
    return `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/${cleanDbName}`;
  } catch (e) {
    throw new Error(`Invalid DATABASE_URL format: ${e.message}`);
  }
};

const maskDatabaseUrl = (url) => {
  if (!url) return 'DATABASE_URL is not set';
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.username}:****@${parsedUrl.host}${parsedUrl.pathname}`;
  } catch (e) {
    return 'Invalid DATABASE_URL format';
  }
};

let dbUrl;
try {
  dbUrl = validateDatabaseUrl(process.env.DATABASE_URL);
  console.log('Attempting to connect to database with URL:', maskDatabaseUrl(dbUrl));
} catch (error) {
  console.error('Database URL validation error:', error.message);
  process.exit(1);
}

const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.DB_SSL === 'false' ? undefined : {
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

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to the database:', err);
    console.error('Full error details:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      original: err.original
    });
    console.error('Connection configuration:', {
      dialect: sequelize.options.dialect,
      host: sequelize.config.host,
      port: sequelize.config.port,
      database: sequelize.config.database,
      username: sequelize.config.username,
      ssl: sequelize.options.dialectOptions.ssl
    });
    
    if (err.original?.code === '3D000') {
      console.log('Attempting to create database...');
      try {
        const tmpSequelize = new Sequelize({
          ...sequelize.config,
          database: 'postgres',
          logging: false
        });
        await tmpSequelize.query(`CREATE DATABASE "${sequelize.config.database}";`);
        await tmpSequelize.close();
        console.log('✅ Database created successfully.');
        
        await sequelize.authenticate();
        console.log('✅ Connected to newly created database.');
      } catch (createErr) {
        console.error('❌ Failed to create database:', createErr);
        throw createErr;
      }
    } else {
      throw err;
    }
  }
};

initializeDatabase().catch(err => {
  console.error('❌ Database initialization failed:', err);
  process.exit(1);
});

module.exports = sequelize; 