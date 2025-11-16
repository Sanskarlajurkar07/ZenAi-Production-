// zenai-backend/src/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    // Check if MONGODB_URI is defined
    if (!process.env.MONGODB_URI) {
      logger.error('MONGODB_URI is not defined in environment variables');
      logger.info('Please create a .env file with MONGODB_URI=mongodb://localhost:27017/zenai');
      process.exit(1);
    }

    // Log connection attempt (hide password)
    const sanitizedUri = process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    logger.info(`Attempting to connect to MongoDB: ${sanitizedUri}`);

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`✓ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`✓ Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error closing MongoDB connection:', err);
        process.exit(1);
      }
    });

    return conn;

  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    
    // Provide helpful error messages
    if (error.message.includes('ECONNREFUSED')) {
      logger.error('❌ Cannot connect to MongoDB. Is MongoDB running?');
      logger.info('💡 Start MongoDB with: net start MongoDB (Windows)');
      logger.info('💡 Or use MongoDB Atlas: https://www.mongodb.com/cloud/atlas');
    } else if (error.message.includes('authentication failed')) {
      logger.error('❌ MongoDB authentication failed. Check username/password');
    } else if (error.message.includes('getaddrinfo ENOTFOUND')) {
      logger.error('❌ Cannot resolve MongoDB host. Check your connection string');
    }
    
    process.exit(1);
  }
};

module.exports = connectDB;