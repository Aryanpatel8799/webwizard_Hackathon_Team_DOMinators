import { z } from 'zod';

/**
 * Event registration form validation schema
 */
export const registrationSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),
  
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  
  phone: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional field
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      return phoneRegex.test(val.replace(/[\s\-\(\)]/g, ''));
    }, 'Please enter a valid phone number'),
  
  college: z
    .string()
    .max(100, 'College name is too long')
    .optional(),
  
  organization: z
    .string()
    .max(100, 'Organization name is too long')
    .optional(),
  
  role: z
    .string()
    .max(50, 'Role is too long')
    .optional(),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

/**
 * Admin login form validation schema
 */
export const loginSchema = z.object({
  email: z
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email is too long'),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password is too long'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Event creation form validation schema
 */
export const eventSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must be less than 2000 characters'),
  
  date: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      return date > new Date();
    }, 'Event date must be in the future'),
  
  venue: z
    .string()
    .min(3, 'Venue must be at least 3 characters')
    .max(300, 'Venue must be less than 300 characters'),
  
  capacity: z
    .number()
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(10000, 'Capacity cannot exceed 10,000'),
  
  category: z
    .enum(['hackathon', 'workshop', 'seminar', 'conference', 'networking', 'other'])
    .default('other'),
  
  tags: z
    .array(z.string().max(20, 'Tag is too long'))
    .max(10, 'Maximum 10 tags allowed')
    .optional(),
  
  registrationDeadline: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      const deadline = new Date(val);
      return deadline > new Date();
    }, 'Registration deadline must be in the future'),
  
  organizer: z.object({
    name: z
      .string()
      .min(2, 'Organizer name is required')
      .max(100, 'Name is too long'),
    email: z
      .string()
      .email('Valid email required')
      .max(255, 'Email is too long'),
    phone: z
      .string()
      .max(20, 'Phone number is too long')
      .optional(),
  }),
});

export type EventFormData = z.infer<typeof eventSchema>;

/**
 * Theme validation schema
 */
export const themeSchema = z.enum(['light', 'dark', 'system']);

export type Theme = z.infer<typeof themeSchema>;
