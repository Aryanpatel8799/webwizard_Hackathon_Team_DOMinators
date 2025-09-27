import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../../src/app.js';
import Event from '../../src/models/Event.js';
import Admin from '../../src/models/Admin.js';
import bcrypt from 'bcryptjs';

describe('Events API', () => {
  let app;
  let adminToken;
  let testEvent;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    app = createApp();

    // Create test admin user
    const adminPassword = await bcrypt.hash('testPassword123!', 12);
    const testAdmin = await Admin.create({
      username: 'testadmin',
      email: 'testadmin@test.com',
      password: adminPassword,
      firstName: 'Test',
      lastName: 'Admin',
      role: 'super_admin',
      permissions: {
        events: ['create', 'read', 'update', 'delete'],
        registrations: ['create', 'read', 'update', 'delete']
      }
    });

    // Login to get token
    const loginResponse = await request(app)
      .post('/api/admin/auth/login')
      .send({
        email: 'testadmin@test.com',
        password: 'testPassword123!'
      });

    adminToken = loginResponse.body.token;
  });

  beforeEach(async () => {
    // Clear events collection
    await Event.deleteMany({});

    // Create a test event
    testEvent = await Event.create({
      title: 'Test Event',
      description: 'A test event for API testing',
      category: 'Technology',
      startDate: new Date('2024-12-01T10:00:00Z'),
      endDate: new Date('2024-12-01T18:00:00Z'),
      venue: {
        type: 'physical',
        location: 'Test Venue',
        address: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country'
      },
      organizer: {
        name: 'Test Organizer',
        email: 'organizer@test.com',
        phone: '+1234567890'
      },
      registrationDeadline: new Date('2024-11-30T23:59:59Z'),
      maxCapacity: 100,
      pricing: {
        isFree: false,
        amount: 50,
        currency: 'USD'
      },
      status: 'published'
    });
  });

  afterAll(async () => {
    await Event.deleteMany({});
    await Admin.deleteMany({});
    await mongoose.connection.close();
  });

  describe('GET /api/events', () => {
    it('should return list of published events', async () => {
      const response = await request(app)
        .get('/api/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events).toBeDefined();
      expect(response.body.data.events.length).toBeGreaterThan(0);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('should filter events by category', async () => {
      const response = await request(app)
        .get('/api/events?category=Technology')
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.events.forEach(event => {
        expect(event.category).toBe('Technology');
      });
    });

    it('should search events by title', async () => {
      const response = await request(app)
        .get('/api/events?search=Test')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.events.length).toBeGreaterThan(0);
    });

    it('should paginate results', async () => {
      // Create multiple events
      for (let i = 0; i < 15; i++) {
        await Event.create({
          title: `Event ${i}`,
          description: `Description ${i}`,
          startDate: new Date('2024-12-01T10:00:00Z'),
          endDate: new Date('2024-12-01T18:00:00Z'),
          venue: { type: 'virtual', location: 'Online' },
          organizer: {
            name: 'Organizer',
            email: `organizer${i}@test.com`,
            phone: '+1234567890'
          },
          status: 'published'
        });
      }

      const response = await request(app)
        .get('/api/events?page=2&limit=5')
        .expect(200);

      expect(response.body.data.events.length).toBeLessThanOrEqual(5);
      expect(response.body.data.pagination.currentPage).toBe(2);
      expect(response.body.data.pagination.totalPages).toBeGreaterThan(1);
    });
  });

  describe('GET /api/events/:id', () => {
    it('should return event by ID', async () => {
      const response = await request(app)
        .get(`/api/events/${testEvent._id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(testEvent.title);
      expect(response.body.data.description).toBe(testEvent.description);
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      const response = await request(app)
        .get(`/api/events/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Event not found');
    });

    it('should return 400 for invalid event ID', async () => {
      const response = await request(app)
        .get('/api/events/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/events', () => {
    it('should create new event with valid data', async () => {
      const newEvent = {
        title: 'New Test Event',
        description: 'A new test event',
        category: 'Business',
        startDate: '2024-12-15T10:00:00Z',
        endDate: '2024-12-15T18:00:00Z',
        venue: {
          type: 'physical',
          location: 'New Venue',
          address: '456 New St',
          city: 'New City',
          state: 'New State',
          zipCode: '67890',
          country: 'New Country'
        },
        organizer: {
          name: 'New Organizer',
          email: 'neworganizer@test.com',
          phone: '+1987654321'
        },
        registrationDeadline: '2024-12-14T23:59:59Z',
        maxCapacity: 200,
        pricing: {
          isFree: true,
          amount: 0,
          currency: 'USD'
        }
      };

      const response = await request(app)
        .post('/api/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEvent)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(newEvent.title);
      expect(response.body.data.slug).toBeDefined();
      expect(response.body.data.status).toBe('draft');
    });

    it('should return 401 without authentication', async () => {
      const newEvent = {
        title: 'Unauthorized Event',
        description: 'Should fail',
        startDate: '2024-12-15T10:00:00Z',
        endDate: '2024-12-15T18:00:00Z'
      };

      await request(app)
        .post('/api/admin/events')
        .send(newEvent)
        .expect(401);
    });

    it('should return 400 with invalid data', async () => {
      const invalidEvent = {
        title: '', // Empty title
        description: 'Invalid event'
      };

      const response = await request(app)
        .post('/api/admin/events')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidEvent)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('validation');
    });
  });

  describe('PUT /api/admin/events/:id', () => {
    it('should update event with valid data', async () => {
      const updateData = {
        title: 'Updated Test Event',
        description: 'Updated description',
        maxCapacity: 150
      };

      const response = await request(app)
        .put(`/api/admin/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.maxCapacity).toBe(updateData.maxCapacity);
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .put(`/api/admin/events/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated' })
        .expect(404);
    });
  });

  describe('DELETE /api/admin/events/:id', () => {
    it('should delete event', async () => {
      const response = await request(app)
        .delete(`/api/admin/events/${testEvent._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted');

      // Verify event is deleted
      const deletedEvent = await Event.findById(testEvent._id);
      expect(deletedEvent).toBeNull();
    });

    it('should return 404 for non-existent event', async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      
      await request(app)
        .delete(`/api/admin/events/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/admin/events/:id/status', () => {
    it('should publish draft event', async () => {
      const response = await request(app)
        .patch(`/api/admin/events/${testEvent._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('published');
    });

    it('should cancel published event', async () => {
      const response = await request(app)
        .patch(`/api/admin/events/${testEvent._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'cancelled' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('cancelled');
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch(`/api/admin/events/${testEvent._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
