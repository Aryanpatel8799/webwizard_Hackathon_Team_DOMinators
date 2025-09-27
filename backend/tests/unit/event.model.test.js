import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import Event from '../../src/models/Event.js';

describe('Event Model', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schema Validation', () => {
    it('should create a valid event', async () => {
      const validEvent = {
        title: 'Test Event',
        description: 'A test event description',
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
        }
      };

      const event = new Event(validEvent);
      expect(event.title).toBe(validEvent.title);
      expect(event.venue.type).toBe('physical');
      expect(event.pricing.amount).toBe(50);
    });

    it('should require mandatory fields', async () => {
      const invalidEvent = new Event({});
      
      const validationError = invalidEvent.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors.title).toBeDefined();
      expect(validationError.errors.description).toBeDefined();
      expect(validationError.errors.startDate).toBeDefined();
    });

    it('should validate venue type enum', async () => {
      const eventWithInvalidVenue = new Event({
        title: 'Test Event',
        description: 'Test description',
        startDate: new Date(),
        endDate: new Date(),
        venue: {
          type: 'invalid_type',
          location: 'Test Location'
        }
      });

      const validationError = eventWithInvalidVenue.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors['venue.type']).toBeDefined();
    });

    it('should validate email format', async () => {
      const eventWithInvalidEmail = new Event({
        title: 'Test Event',
        description: 'Test description',
        startDate: new Date(),
        endDate: new Date(),
        organizer: {
          name: 'Test Organizer',
          email: 'invalid-email',
          phone: '+1234567890'
        }
      });

      const validationError = eventWithInvalidEmail.validateSync();
      expect(validationError).toBeDefined();
      expect(validationError.errors['organizer.email']).toBeDefined();
    });
  });

  describe('Instance Methods', () => {
    let event;

    beforeEach(() => {
      event = new Event({
        title: 'Test Event',
        description: 'Test description',
        startDate: new Date('2024-12-01T10:00:00Z'),
        endDate: new Date('2024-12-01T18:00:00Z'),
        maxCapacity: 100,
        currentRegistrations: 50,
        venue: {
          type: 'physical',
          location: 'Test Venue'
        },
        organizer: {
          name: 'Test Organizer',
          email: 'test@test.com',
          phone: '+1234567890'
        }
      });
    });

    it('should calculate available spots correctly', () => {
      expect(event.getAvailableSpots()).toBe(50);
    });

    it('should determine if event is full', () => {
      event.currentRegistrations = 100;
      expect(event.isFull()).toBe(true);
      
      event.currentRegistrations = 99;
      expect(event.isFull()).toBe(false);
    });

    it('should determine if registration is open', () => {
      event.registrationDeadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      event.status = 'published';
      expect(event.isRegistrationOpen()).toBe(true);

      event.registrationDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
      expect(event.isRegistrationOpen()).toBe(false);

      event.status = 'cancelled';
      expect(event.isRegistrationOpen()).toBe(false);
    });

    it('should determine if event has started', () => {
      event.startDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      expect(event.hasStarted()).toBe(true);

      event.startDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(event.hasStarted()).toBe(false);
    });

    it('should determine if event has ended', () => {
      event.endDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      expect(event.hasEnded()).toBe(true);

      event.endDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(event.hasEnded()).toBe(false);
    });

    it('should calculate event duration in hours', () => {
      const start = new Date('2024-12-01T10:00:00Z');
      const end = new Date('2024-12-01T18:00:00Z');
      event.startDate = start;
      event.endDate = end;
      
      expect(event.getDurationInHours()).toBe(8);
    });
  });

  describe('Static Methods', () => {
    it('should find upcoming events', () => {
      const query = Event.findUpcoming();
      expect(query.getQuery()).toHaveProperty('startDate');
      expect(query.getQuery()).toHaveProperty('status', 'published');
    });

    it('should find by category', () => {
      const query = Event.findByCategory('Technology');
      expect(query.getQuery()).toHaveProperty('category', 'Technology');
    });

    it('should find by organizer email', () => {
      const email = 'organizer@test.com';
      const query = Event.findByOrganizer(email);
      expect(query.getQuery()).toHaveProperty('organizer.email', email);
    });

    it('should search events', () => {
      const searchTerm = 'conference';
      const query = Event.search(searchTerm);
      expect(query.getQuery()).toHaveProperty('$or');
    });
  });

  describe('Pre-save Middleware', () => {
    it('should generate slug from title', async () => {
      const event = new Event({
        title: 'My Awesome Event 2024',
        description: 'Test description',
        startDate: new Date(),
        endDate: new Date(),
        venue: { type: 'virtual', location: 'Online' },
        organizer: {
          name: 'Test',
          email: 'test@test.com',
          phone: '+1234567890'
        }
      });

      // Trigger pre-save middleware
      await event.validate();
      event.constructor.schema.pre('save').forEach(fn => fn.call(event));

      expect(event.slug).toBe('my-awesome-event-2024');
    });
  });
});
