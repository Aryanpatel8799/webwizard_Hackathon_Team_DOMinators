#!/usr/bin/env node
import mongoose from 'mongoose';

// Direct MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect('mongodb+srv://amp8799:qsAacCm7***@cluster0.lcgbu.mongodb.net/eventreg');
    console.log('✅ MongoDB connected');
    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

const checkDatabase = async () => {
  await connectDB();
  
  try {
    // List all collections
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📚 Collections:', collections.map(c => c.name));
    
    // Check admins collection directly
    const adminsCollection = db.collection('admins');
    const adminCount = await adminsCollection.countDocuments();
    console.log(`👥 Admin count: ${adminCount}`);
    
    if (adminCount > 0) {
      const admins = await adminsCollection.find({}).toArray();
      console.log('👤 Admin users:');
      admins.forEach(admin => {
        console.log(`  - ${admin.name} (${admin.email}) - Role: ${admin.role}`);
      });
      
      // Test specific admin
      const testAdmin = await adminsCollection.findOne({ email: 'admin@eventapp.com' });
      console.log('🔍 Test admin details:', testAdmin ? 'Found' : 'Not found');
      if (testAdmin) {
        console.log('  Email:', testAdmin.email);
        console.log('  Role:', testAdmin.role);
        console.log('  Active:', testAdmin.isActive);
        console.log('  Has password:', !!testAdmin.passwordHash);
      }
    }
    
    // Check events collection
    const eventsCollection = db.collection('events');
    const eventCount = await eventsCollection.countDocuments();
    console.log(`🎪 Event count: ${eventCount}`);
    
  } catch (error) {
    console.error('❌ Database check error:', error);
  }
  
  process.exit(0);
};

checkDatabase();
