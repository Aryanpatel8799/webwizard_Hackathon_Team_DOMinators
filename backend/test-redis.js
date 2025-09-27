import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const testRedis = async () => {
  const redisUrl = process.env.REDIS_URL;
  
  console.log('🔄 Testing Redis connection...');
  
  if (!redisUrl) {
    console.log('❌ No REDIS_URL found in environment variables');
    console.log('💡 Redis is currently disabled in .env file');
    console.log('✅ This is expected - your server will use memory fallbacks');
    return;
  }
  
  console.log('Redis URL:', redisUrl.substring(0, 30) + '...');
  
  try {
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 15000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500)
      }
    });

    client.on('error', (err) => {
      console.error('❌ Redis client error:', err.message);
    });

    client.on('connect', () => {
      console.log('🔗 Redis client connected');
    });

    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    await client.connect();
    
    // Test basic operations
    const pingResult = await client.ping();
    console.log('🏓 Ping result:', pingResult);
    
    await client.set('test_key', 'Hello Redis!');
    const value = await client.get('test_key');
    console.log('📝 Test write/read:', value);
    
    await client.del('test_key');
    console.log('🗑️ Cleanup completed');
    
    await client.quit();
    console.log('✅ Redis connection test successful!');
    
  } catch (error) {
    console.error('❌ Redis connection test failed:', error.message);
    console.error('Error details:', {
      code: error.code,
      errno: error.errno,
      syscall: error.syscall,
      hostname: error.hostname
    });
  }
};

testRedis();
