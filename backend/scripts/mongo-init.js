// MongoDB initialization script
db = db.getSiblingDB('eventreg');

// Create indexes for better performance
db.events.createIndex({ "date": 1 });
db.events.createIndex({ "createdAt": -1 });

db.registrations.createIndex({ "event": 1 });
db.registrations.createIndex({ "email": 1 });
db.registrations.createIndex({ "status": 1 });
db.registrations.createIndex({ "event": 1, "email": 1 }, { unique: true });
db.registrations.createIndex({ "createdAt": -1 });

db.admins.createIndex({ "email": 1 }, { unique: true });

db.auditlogs.createIndex({ "createdAt": -1 });
db.auditlogs.createIndex({ "actor": 1 });
db.auditlogs.createIndex({ "action": 1 });

print('Database initialized with indexes');
