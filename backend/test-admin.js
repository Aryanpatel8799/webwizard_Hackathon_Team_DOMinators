import './src/config/database.js';
import { Admin } from './src/models/index.js';

async function testAdmin() {
  try {
    console.log('🔍 Looking for admin users...');
    
    // Find all admins
    const allAdmins = await Admin.find({});
    console.log(`📋 Total admins in database: ${allAdmins.length}`);
    
    if (allAdmins.length > 0) {
      allAdmins.forEach((admin, index) => {
        console.log(`👤 Admin ${index + 1}:`, {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          hasPassword: !!admin.passwordHash
        });
      });
    }
    
    // Test finding by email
    console.log('\n🔑 Testing findActiveByEmail...');
    const admin = await Admin.findActiveByEmail('admin@eventapp.com');
    
    if (admin) {
      console.log('✅ Admin found by email:', {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        hasPassword: !!admin.passwordHash
      });
      
      // Test password comparison
      console.log('\n🔐 Testing password comparison...');
      const isPasswordValid = await admin.comparePassword('Admin123!');
      console.log(`Password valid: ${isPasswordValid ? '✅' : '❌'}`);
      
    } else {
      console.log('❌ Admin not found by email');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testAdmin();
