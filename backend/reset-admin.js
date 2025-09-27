import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './src/models/Admin.js';
import config from './src/config/index.js';

const resetAdminPassword = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    await Admin.updateOne(
      { email: 'admin@eventapp.com' },
      { passwordHash: hashedPassword }
    );
    
    console.log('Admin password reset to: admin123');
    console.log('Email: admin@eventapp.com');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

resetAdminPassword();
