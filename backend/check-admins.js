import mongoose from 'mongoose';
import Admin from './src/models/Admin.js';
import config from './src/config/index.js';

const checkAdmins = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const admins = await Admin.find({}).select('name email role isActive');
    console.log('Existing admins:');
    console.log(JSON.stringify(admins, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmins();
