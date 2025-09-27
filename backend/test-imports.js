import config from './src/config/index.js';
import './src/utils/logger.js';
import { connectDatabase } from './src/config/database.js';

console.log('✅ Config loaded successfully');
console.log('✅ Logger loaded successfully'); 
console.log('✅ Database config loaded successfully');
console.log('✅ All basic imports working!');

console.log('\nConfiguration:');
console.log(`Port: ${config.port}`);
console.log(`MongoDB: ${config.mongoUri}`);
console.log(`Environment: ${config.nodeEnv}`);
