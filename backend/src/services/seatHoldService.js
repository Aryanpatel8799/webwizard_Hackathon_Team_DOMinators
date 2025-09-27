import { getRedisClient } from '../config/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class SeatHoldService {
  constructor() {
    this.redis = null;
    this.holdDuration = config.seatHold.seconds;
    this.init();
  }

  async init() {
    this.redis = getRedisClient();
    if (!this.redis) {
      logger.warn('Redis not available. Seat hold service will use fallback mechanism.');
    }
  }

  /**
   * Create a seat hold for a user
   * @param {string} eventId - Event ID
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if hold created successfully
   */
  async createSeatHold(eventId, email) {
    if (!this.redis) {
      // Fallback: return true and rely on atomic database operations
      logger.debug('Using database fallback for seat hold');
      return true;
    }

    try {
      const holdKey = this.getHoldKey(eventId, email);
      
      // Check if user already has a hold
      const existingHold = await this.redis.get(holdKey);
      if (existingHold) {
        // Extend existing hold
        await this.redis.expire(holdKey, this.holdDuration);
        logger.debug(`Extended seat hold for ${email} on event ${eventId}`);
        return true;
      }

      // Create new hold with expiration
      const holdData = {
        eventId,
        email,
        timestamp: Date.now()
      };

      await this.redis.setEx(holdKey, this.holdDuration, JSON.stringify(holdData));
      logger.debug(`Created seat hold for ${email} on event ${eventId} for ${this.holdDuration}s`);
      
      return true;
    } catch (error) {
      logger.error('Error creating seat hold:', error);
      return false;
    }
  }

  /**
   * Check if a seat hold exists
   * @param {string} eventId - Event ID
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - Hold data or null
   */
  async getSeatHold(eventId, email) {
    if (!this.redis) {
      return null;
    }

    try {
      const holdKey = this.getHoldKey(eventId, email);
      const holdData = await this.redis.get(holdKey);
      
      if (holdData) {
        const ttl = await this.redis.ttl(holdKey);
        const parsed = JSON.parse(holdData);
        
        return {
          ...parsed,
          remainingTime: ttl
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting seat hold:', error);
      return null;
    }
  }

  /**
   * Release a seat hold
   * @param {string} eventId - Event ID
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if hold released successfully
   */
  async releaseSeatHold(eventId, email) {
    if (!this.redis) {
      return true;
    }

    try {
      const holdKey = this.getHoldKey(eventId, email);
      const result = await this.redis.del(holdKey);
      
      if (result > 0) {
        logger.debug(`Released seat hold for ${email} on event ${eventId}`);
      }
      
      return true;
    } catch (error) {
      logger.error('Error releasing seat hold:', error);
      return false;
    }
  }

  /**
   * Get all active holds for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Array>} - Array of hold data
   */
  async getActiveHolds(eventId) {
    if (!this.redis) {
      return [];
    }

    try {
      const pattern = this.getHoldKey(eventId, '*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length === 0) {
        return [];
      }

      const holds = [];
      for (const key of keys) {
        try {
          const holdData = await this.redis.get(key);
          if (holdData) {
            const ttl = await this.redis.ttl(key);
            const parsed = JSON.parse(holdData);
            holds.push({
              ...parsed,
              remainingTime: ttl
            });
          }
        } catch (error) {
          logger.error(`Error parsing hold data for key ${key}:`, error);
        }
      }

      return holds;
    } catch (error) {
      logger.error('Error getting active holds:', error);
      return [];
    }
  }

  /**
   * Get count of active holds for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<number>} - Number of active holds
   */
  async getActiveHoldsCount(eventId) {
    if (!this.redis) {
      return 0;
    }

    try {
      const pattern = this.getHoldKey(eventId, '*');
      const keys = await this.redis.keys(pattern);
      return keys.length;
    } catch (error) {
      logger.error('Error getting active holds count:', error);
      return 0;
    }
  }

  /**
   * Clean up expired holds (usually handled by Redis TTL, but good for cleanup)
   * @param {string} eventId - Optional event ID to clean specific event holds
   * @returns {Promise<number>} - Number of holds cleaned up
   */
  async cleanupExpiredHolds(eventId = null) {
    if (!this.redis) {
      return 0;
    }

    try {
      const pattern = eventId ? this.getHoldKey(eventId, '*') : 'seat_hold:*';
      const keys = await this.redis.keys(pattern);
      
      let cleanedUp = 0;
      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl <= 0) {
          await this.redis.del(key);
          cleanedUp++;
        }
      }

      if (cleanedUp > 0) {
        logger.info(`Cleaned up ${cleanedUp} expired seat holds`);
      }

      return cleanedUp;
    } catch (error) {
      logger.error('Error cleaning up expired holds:', error);
      return 0;
    }
  }

  /**
   * Check if seat hold is required for registration
   * @param {string} eventId - Event ID
   * @param {string} email - User email
   * @returns {Promise<boolean>} - True if hold is valid or not required
   */
  async validateSeatHold(eventId, email) {
    if (!this.redis) {
      // If Redis is not available, always allow registration
      // and rely on atomic database operations
      return true;
    }

    const hold = await this.getSeatHold(eventId, email);
    return hold !== null;
  }

  /**
   * Generate hold key for Redis
   * @param {string} eventId - Event ID
   * @param {string} email - User email
   * @returns {string} - Redis key
   */
  getHoldKey(eventId, email) {
    return `seat_hold:${eventId}:${email.toLowerCase()}`;
  }

  /**
   * Get seat hold statistics for an event
   * @param {string} eventId - Event ID
   * @returns {Promise<Object>} - Hold statistics
   */
  async getHoldStats(eventId) {
    const holds = await this.getActiveHolds(eventId);
    
    const stats = {
      totalHolds: holds.length,
      averageRemainingTime: 0,
      expiringsSoon: 0 // holds expiring in next 30 seconds
    };

    if (holds.length > 0) {
      const totalTime = holds.reduce((sum, hold) => sum + hold.remainingTime, 0);
      stats.averageRemainingTime = Math.round(totalTime / holds.length);
      stats.expiringsSoon = holds.filter(hold => hold.remainingTime <= 30).length;
    }

    return stats;
  }
}

export default new SeatHoldService();
