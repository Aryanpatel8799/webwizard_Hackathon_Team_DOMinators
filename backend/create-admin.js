import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './src/models/Admin.js';
import config from './src/config/index.js';

const createAdmin = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@eventapp.com' });
    if (existingAdmin) {
      console.log('Admin already exists');
      process.exit(0);
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    const admin = new Admin({
      name: 'Admin User',
      email: 'admin@eventapp.com',
      password: hashedPassword,
      role: 'superadmin',
      isActive: true,
      permissions: {
        events: { create: true, read: true, update: true, delete: true },
        registrations: { create: true, read: true, update: true, delete: true },
        admin: { create: true, read: true, update: true, delete: true }
      }
    });

    await admin.save();
    console.log('Admin user created successfully!');
    console.log('Email: admin@eventapp.com');
    console.log('Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();
