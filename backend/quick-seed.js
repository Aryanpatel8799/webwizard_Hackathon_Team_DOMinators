import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { connectDatabase } from './src/config/database.js';
import Admin from './src/models/Admin.js';
import Event from './src/models/Event.js';

const quickSeed = async () => {
  try {
    console.log('🌱 Quick seeding...');
    
    // Connect to database
    await connectDatabase();
    
    // Clear existing data
    await Admin.deleteMany({});
    await Event.deleteMany({});
    
    // Create admin user
    const admin = await Admin.create({
      name: 'Super Admin',
      email: 'admin@eventapp.com',
      passwordHash: 'Admin123!', // Will be hashed by pre-save middleware
      role: 'superadmin',
      isActive: true,
      permissions: {
        events: { create: true, read: true, update: true, delete: true },
        registrations: { create: true, read: true, update: true, delete: true },
        users: { create: true, read: true, update: true, delete: true },
        analytics: { read: true },
        settings: { read: true, update: true }
      }
    });
    
    // Create sample event
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() + 30); // 30 days from now
    
    const registrationDeadline = new Date();
    registrationDeadline.setDate(registrationDeadline.getDate() + 25); // 25 days from now
    
    const sampleEvent = new Event({
      title: 'Sample Hackathon Event',
      description: 'A sample hackathon event for testing purposes',
      capacity: 100,
      date: eventDate,
      venue: 'Tech Hub, 123 Tech Street, Tech City, CA 12345, USA',
      category: 'hackathon',
      tags: ['tech', 'coding', 'innovation'],
      attendeesCount: 0,
      isActive: true,
      registrationDeadline: registrationDeadline,
      organizer: {
        name: 'Event Admin',
        email: 'admin@example.com',
        phone: '+1-555-0123'
      }
    });

    await sampleEvent.save();
    
    console.log('✅ Quick seed completed!');
    console.log('👤 Admin: admin@eventapp.com / Admin123!');
    console.log('🎉 Event created:', sampleEvent.title);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

quickSeed();
