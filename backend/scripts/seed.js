import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import config from '../src/config/index.js';
import { connectDatabase } from '../src/config/database.js';
import logger from '../src/utils/logger.js';

// Import models
import Event from '../src/models/Event.js';
import Registration from '../src/models/Registration.js';
import Admin from '../src/models/Admin.js';
import AuditLog from '../src/models/AuditLog.js';

/**
 * Generate demo events
 */
const generateEvents = () => {
  const events = [];
  const categories = ['Technology', 'Business', 'Design', 'Marketing', 'Education', 'Health'];
  const venues = [
    'Tech Convention Center',
    'Innovation Hub',
    'Business District Hall',
    'Creative Space',
    'University Auditorium',
    'Online Platform'
  ];

  // Create 15 sample events with different statuses and dates
  for (let i = 0; i < 15; i++) {
    const startDate = faker.date.future({ years: 1 });
    const endDate = new Date(startDate.getTime() + (Math.random() * 3 + 1) * 24 * 60 * 60 * 1000);
    const registrationDeadline = new Date(startDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
    const maxCapacity = Math.floor(Math.random() * 500) + 50;

    events.push({
      title: faker.company.catchPhrase() + ' ' + (i + 2024),
      description: faker.lorem.paragraphs(3),
      category: faker.helpers.arrayElement(categories),
      startDate,
      endDate,
      venue: {
        type: Math.random() > 0.3 ? 'physical' : 'virtual',
        location: Math.random() > 0.3 ? faker.helpers.arrayElement(venues) : 'Online Event',
        address: Math.random() > 0.3 ? faker.location.streetAddress() : null,
        city: Math.random() > 0.3 ? faker.location.city() : null,
        state: Math.random() > 0.3 ? faker.location.state() : null,
        zipCode: Math.random() > 0.3 ? faker.location.zipCode() : null,
        country: Math.random() > 0.3 ? faker.location.country() : null
      },
      organizer: {
        name: faker.company.name(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        website: faker.internet.url()
      },
      registrationDeadline,
      maxCapacity,
      currentRegistrations: 0,
      pricing: {
        isFree: Math.random() > 0.6,
        amount: Math.random() > 0.6 ? 0 : Math.floor(Math.random() * 200) + 25,
        currency: 'USD'
      },
      status: faker.helpers.arrayElement(['draft', 'published', 'published', 'published']),
      tags: faker.helpers.arrayElements(['hackathon', 'conference', 'workshop', 'seminar', 'networking', 'training'], 3),
      requiresApproval: Math.random() > 0.7,
      allowWaitlist: true,
      customFields: Math.random() > 0.5 ? [
        {
          name: 'Dietary Restrictions',
          type: 'text',
          required: false,
          placeholder: 'Any dietary restrictions?'
        },
        {
          name: 'T-Shirt Size',
          type: 'select',
          required: true,
          options: ['XS', 'S', 'M', 'L', 'XL', 'XXL']
        }
      ] : [],
      socialMedia: {
        website: faker.internet.url(),
        twitter: `@${faker.internet.userName()}`,
        linkedin: faker.internet.url(),
        facebook: faker.internet.url()
      },
      images: {
        banner: null,
        gallery: []
      }
    });
  }

  return events;
};

/**
 * Generate demo registrations
 */
const generateRegistrations = (events) => {
  const registrations = [];
  const statuses = ['confirmed', 'pending', 'cancelled', 'waitlisted'];

  events.forEach(event => {
    // Generate random number of registrations for each event
    const registrationCount = Math.floor(Math.random() * (event.maxCapacity * 0.8)) + 5;
    
    for (let i = 0; i < registrationCount; i++) {
      const status = faker.helpers.arrayElement(statuses);
      
      registrations.push({
        eventId: event._id,
        attendee: {
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
          email: faker.internet.email(),
          phone: faker.phone.number(),
          organization: Math.random() > 0.5 ? faker.company.name() : undefined,
          jobTitle: Math.random() > 0.5 ? faker.person.jobTitle() : undefined,
          dietary: Math.random() > 0.7 ? faker.helpers.arrayElement(['Vegetarian', 'Vegan', 'Gluten-Free', 'None']) : undefined
        },
        status,
        registrationDate: faker.date.past({ years: 1 }),
        paymentStatus: status === 'confirmed' ? 'completed' : 'pending',
        paymentMethod: status === 'confirmed' ? faker.helpers.arrayElement(['stripe', 'paypal', 'bank_transfer']) : null,
        transactionId: status === 'confirmed' ? `txn_${faker.string.alphanumeric(16)}` : null,
        amount: event.pricing.isFree ? 0 : event.pricing.amount,
        currency: event.pricing.currency,
        source: faker.helpers.arrayElement(['website', 'mobile', 'admin']),
        referralCode: Math.random() > 0.8 ? `REF${faker.string.alphanumeric(6)}` : undefined,
        customFieldResponses: event.customFields.length > 0 ? event.customFields.map(field => ({
          fieldName: field.name,
          value: field.type === 'select' 
            ? faker.helpers.arrayElement(field.options)
            : faker.lorem.words(2)
        })) : [],
        checkInTime: status === 'confirmed' && Math.random() > 0.6 
          ? faker.date.recent({ days: 30 }) 
          : undefined,
        qrCode: `qr_${faker.string.alphanumeric(20)}`,
        notes: Math.random() > 0.8 ? faker.lorem.sentence() : undefined
      });
    }

    // Update event's current registration count
    event.currentRegistrations = registrations.filter(
      reg => reg.eventId.equals(event._id) && ['confirmed', 'pending'].includes(reg.status)
    ).length;
  });

  return registrations;
};

/**
 * Generate admin users
 */
const generateAdmins = async () => {
  const admins = [];
  
  // Super admin
  admins.push({
    username: 'admin',
    email: 'admin@eventapp.com',
    password: await bcrypt.hash('Admin123!', 12),
    firstName: 'Super',
    lastName: 'Admin',
    role: 'super_admin',
    status: 'active',
    permissions: {
      events: ['create', 'read', 'update', 'delete'],
      registrations: ['create', 'read', 'update', 'delete'],
      users: ['create', 'read', 'update', 'delete'],
      analytics: ['read'],
      settings: ['read', 'update']
    },
    lastLogin: faker.date.recent({ days: 1 })
  });

  // Event manager
  admins.push({
    username: 'manager',
    email: 'manager@eventapp.com',
    password: await bcrypt.hash('Manager123!', 12),
    firstName: 'Event',
    lastName: 'Manager',
    role: 'event_manager',
    status: 'active',
    permissions: {
      events: ['create', 'read', 'update'],
      registrations: ['read', 'update'],
      analytics: ['read']
    },
    lastLogin: faker.date.recent({ days: 2 })
  });

  // Support staff
  admins.push({
    username: 'support',
    email: 'support@eventapp.com',
    password: await bcrypt.hash('Support123!', 12),
    firstName: 'Support',
    lastName: 'Staff',
    role: 'support',
    status: 'active',
    permissions: {
      registrations: ['read', 'update']
    },
    lastLogin: faker.date.recent({ days: 3 })
  });

  return admins;
};

/**
 * Generate audit logs
 */
const generateAuditLogs = (admins, events, registrations) => {
  const logs = [];
  const actions = [
    'EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_PUBLISHED', 'EVENT_CANCELLED',
    'REGISTRATION_CREATED', 'REGISTRATION_UPDATED', 'REGISTRATION_CANCELLED',
    'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'PASSWORD_CHANGED',
    'BULK_IMPORT', 'DATA_EXPORT', 'SETTINGS_UPDATED'
  ];

  // Generate 100 audit log entries
  for (let i = 0; i < 100; i++) {
    const admin = faker.helpers.arrayElement(admins);
    const action = faker.helpers.arrayElement(actions);
    
    let resourceType = 'event';
    let resourceId = faker.helpers.arrayElement(events)._id;
    
    if (action.includes('REGISTRATION')) {
      resourceType = 'registration';
      resourceId = faker.helpers.arrayElement(registrations)._id;
    } else if (action.includes('ADMIN')) {
      resourceType = 'admin';
      resourceId = admin._id;
    }

    logs.push({
      adminId: admin._id,
      action,
      resourceType,
      resourceId,
      changes: {
        before: { status: 'draft' },
        after: { status: 'published' }
      },
      metadata: {
        userAgent: faker.internet.userAgent(),
        ipAddress: faker.internet.ip(),
        timestamp: faker.date.recent({ days: 30 })
      }
    });
  }

  return logs;
};

/**
 * Clear existing data
 */
const clearDatabase = async () => {
  logger.info('Clearing existing data...');
  
  await Event.deleteMany({});
  await Registration.deleteMany({});
  await Admin.deleteMany({});
  await AuditLog.deleteMany({});
  
  logger.info('Database cleared');
};

/**
 * Seed the database
 */
const seedDatabase = async (options = {}) => {
  const { clearFirst = true, skipAdmins = false } = options;
  
  try {
    logger.info('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDatabase();
    
    // Clear existing data if requested
    if (clearFirst) {
      await clearDatabase();
    }

    // Generate and insert admins
    if (!skipAdmins) {
      logger.info('Creating admin users...');
      const admins = await generateAdmins();
      const createdAdmins = await Admin.insertMany(admins);
      logger.info(`✅ Created ${createdAdmins.length} admin users`);
      
      logger.info('\n👤 Admin Credentials:');
      logger.info('Super Admin: admin@eventapp.com / Admin123!');
      logger.info('Event Manager: manager@eventapp.com / Manager123!');
      logger.info('Support Staff: support@eventapp.com / Support123!');
    }

    // Generate and insert events
    logger.info('\nCreating events...');
    const events = generateEvents();
    const createdEvents = await Event.insertMany(events);
    logger.info(`✅ Created ${createdEvents.length} events`);

    // Generate and insert registrations
    logger.info('Creating registrations...');
    const registrations = generateRegistrations(createdEvents);
    const createdRegistrations = await Registration.insertMany(registrations);
    logger.info(`✅ Created ${createdRegistrations.length} registrations`);

    // Update event registration counts
    logger.info('Updating event statistics...');
    for (const event of createdEvents) {
      const confirmedCount = await Registration.countDocuments({
        eventId: event._id,
        status: { $in: ['confirmed', 'pending'] }
      });
      
      await Event.updateOne(
        { _id: event._id },
        { currentRegistrations: confirmedCount }
      );
    }

    // Generate and insert audit logs (if admins exist)
    if (!skipAdmins) {
      logger.info('Creating audit logs...');
      const adminUsers = await Admin.find({});
      const auditLogs = generateAuditLogs(adminUsers, createdEvents, createdRegistrations);
      const createdLogs = await AuditLog.insertMany(auditLogs);
      logger.info(`✅ Created ${createdLogs.length} audit log entries`);
    }

    // Database statistics
    const stats = {
      events: await Event.countDocuments(),
      registrations: await Registration.countDocuments(),
      admins: await Admin.countDocuments(),
      auditLogs: await AuditLog.countDocuments()
    };

    logger.info('\n📊 Database Statistics:');
    logger.info(`Events: ${stats.events}`);
    logger.info(`Registrations: ${stats.registrations}`);
    logger.info(`Admin Users: ${stats.admins}`);
    logger.info(`Audit Logs: ${stats.auditLogs}`);
    
    logger.info('\n🎉 Database seeding completed successfully!');
    
    return stats;
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

/**
 * Command line interface
 */
const runCLI = async () => {
  const args = process.argv.slice(2);
  const options = {
    clearFirst: !args.includes('--no-clear'),
    skipAdmins: args.includes('--skip-admins')
  };

  try {
    await seedDatabase(options);
    
    logger.info('\n🚀 You can now start the application with:');
    logger.info('npm run dev (development)');
    logger.info('npm run prod (production)');
    
    process.exit(0);
  } catch (error) {
    logger.error('Seeding failed:', error);
    process.exit(1);
  }
};

// Run CLI if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCLI();
}

export { seedDatabase, clearDatabase };
export default seedDatabase;
