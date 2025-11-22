import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * MongoDB connection service
 * Handles connection to MongoDB database
 */
class MongoDBService {
  constructor() {
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    if (this.isConnected) {
      logger.debug('MongoDB already connected');
      return;
    }

    const mongoUrl = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/walrus-blobs';
    
    try {
      logger.info(`Connecting to MongoDB: ${mongoUrl.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
      
      this.connection = await mongoose.connect(mongoUrl, {
        serverSelectionTimeoutMS: 5000,
      });
      
      this.isConnected = true;
      logger.info('MongoDB connected successfully');
      
      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
        this.isConnected = false;
      });
      
      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });
      
      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });
      
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    }
  }

  /**
   * Check if connected
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
    };
  }
}

// Export singleton instance
let instance = null;
export function getMongoDBService() {
  if (!instance) {
    instance = new MongoDBService();
  }
  return instance;
}

export const mongoDBService = getMongoDBService();

