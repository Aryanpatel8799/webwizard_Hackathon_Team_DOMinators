import { toast } from 'sonner';

// Email templates
export const EmailTemplates = {
  REGISTRATION_CONFIRMATION: 'registration_confirmation',
  EVENT_REMINDER: 'event_reminder',
  EVENT_UPDATE: 'event_update',
  CANCELLATION: 'cancellation',
  WAITLIST_NOTIFICATION: 'waitlist_notification',
  WELCOME: 'welcome'
} as const;

export type EmailTemplate = typeof EmailTemplates[keyof typeof EmailTemplates];

// Email data interfaces
export interface EmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  template: EmailTemplate;
  variables: Record<string, any>;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: string; // base64 or URL
  contentType: string;
}

export interface BulkEmailData {
  recipients: Array<{
    email: string;
    name: string;
    variables?: Record<string, any>;
  }>;
  template: EmailTemplate;
  subject: string;
  globalVariables?: Record<string, any>;
}

// Email service class
export class EmailService {
  private static baseUrl = 'http://localhost:4000';

  // Send single email
  static async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Mock implementation for now - replace with actual API call when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
      
      console.log('Mock Email Service - Sending email:', {
        to: emailData.to,
        subject: emailData.subject,
        template: emailData.template
      });
      
      toast.success(`Email sent successfully to ${emailData.to.join(', ')}`);
      
      return {
        success: true,
        messageId: `mock-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      // Uncomment when backend email API is ready:
      /*
      const response = await fetch(`${this.baseUrl}/api/emails/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Email sent successfully!');
        return { success: true, messageId: result.messageId };
      } else {
        toast.error(result.message || 'Failed to send email');
        return { success: false, error: result.message };
      }
      */
    } catch (error) {
      console.warn('Email service not available, simulating send:', error);
      
      // Simulate email sending for demo
      await this.simulateEmailSend(emailData);
      return { success: true, messageId: `sim_${Date.now()}` };
    }
  }

  // Send bulk emails
  static async sendBulkEmail(bulkData: BulkEmailData): Promise<{ 
    success: boolean; 
    sent: number; 
    failed: number; 
    errors?: string[] 
  }> {
    try {
      // Mock implementation for now - replace with actual API call when backend is ready
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
      
      console.log('Mock Email Service - Sending bulk emails:', {
        recipients: bulkData.recipients.length,
        template: bulkData.template,
        subject: bulkData.subject
      });
      
      // Simulate bulk email sending for demo
      const sent = Math.floor(bulkData.recipients.length * 0.95); // 95% success rate
      const failed = bulkData.recipients.length - sent;
      
      toast.success(`Bulk email sent to ${sent} recipients! ${failed > 0 ? `${failed} failed` : ''}`);
      return { success: true, sent, failed };
      
      // Uncomment when backend email API is ready:
      /*
      const response = await fetch(`${this.baseUrl}/api/emails/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify(bulkData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Bulk email sent to ${result.sent} recipients!`);
        return result;
      } else {
        toast.error(result.message || 'Failed to send bulk email');
        return { success: false, sent: 0, failed: bulkData.recipients.length, errors: [result.message] };
      }
      */
    } catch (error) {
      console.warn('Bulk email service not available, simulating send:', error);
      
      // Simulate bulk email sending for demo
      const sent = Math.floor(bulkData.recipients.length * 0.95); // 95% success rate
      const failed = bulkData.recipients.length - sent;
      
      toast.success(`Simulated: ${sent} emails sent, ${failed} failed`);
      return { success: true, sent, failed };
    }
  }

  // Send registration confirmation
  static async sendRegistrationConfirmation(registration: {
    name: string;
    email: string;
    event: {
      title: string;
      date: string;
      venue: string;
      description?: string;
    };
    qrCode?: string;
    ticketId?: string;
  }): Promise<boolean> {
    const emailData: EmailData = {
      to: [registration.email],
      subject: `Registration Confirmed: ${registration.event.title}`,
      template: EmailTemplates.REGISTRATION_CONFIRMATION,
      variables: {
        attendeeName: registration.name,
        eventTitle: registration.event.title,
        eventDate: new Date(registration.event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        eventVenue: registration.event.venue,
        eventDescription: registration.event.description,
        ticketId: registration.ticketId,
        qrCodeUrl: registration.qrCode
      },
      attachments: registration.qrCode ? [{
        filename: `ticket-${registration.ticketId}.png`,
        content: registration.qrCode,
        contentType: 'image/png'
      }] : undefined
    };

    const result = await this.sendEmail(emailData);
    return result.success;
  }

  // Send event reminder
  static async sendEventReminder(attendees: Array<{
    name: string;
    email: string;
  }>, event: {
    title: string;
    date: string;
    venue: string;
    description?: string;
  }): Promise<{ sent: number; failed: number }> {
    const bulkData: BulkEmailData = {
      recipients: attendees.map(attendee => ({
        email: attendee.email,
        name: attendee.name,
        variables: {
          attendeeName: attendee.name
        }
      })),
      subject: `Reminder: ${event.title} is tomorrow!`,
      template: EmailTemplates.EVENT_REMINDER,
      globalVariables: {
        eventTitle: event.title,
        eventDate: new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        eventVenue: event.venue,
        eventDescription: event.description
      }
    };

    const result = await this.sendBulkEmail(bulkData);
    return { sent: result.sent, failed: result.failed };
  }

  // Send event update notification
  static async sendEventUpdate(attendees: Array<{
    name: string;
    email: string;
  }>, event: {
    title: string;
    date: string;
    venue: string;
  }, updateMessage: string): Promise<{ sent: number; failed: number }> {
    const bulkData: BulkEmailData = {
      recipients: attendees.map(attendee => ({
        email: attendee.email,
        name: attendee.name,
        variables: {
          attendeeName: attendee.name
        }
      })),
      subject: `Important Update: ${event.title}`,
      template: EmailTemplates.EVENT_UPDATE,
      globalVariables: {
        eventTitle: event.title,
        eventDate: new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        eventVenue: event.venue,
        updateMessage
      }
    };

    const result = await this.sendBulkEmail(bulkData);
    return { sent: result.sent, failed: result.failed };
  }

  // Send waitlist notification
  static async sendWaitlistNotification(waitlistedUser: {
    name: string;
    email: string;
  }, event: {
    title: string;
    date: string;
    venue: string;
  }): Promise<boolean> {
    const emailData: EmailData = {
      to: [waitlistedUser.email],
      subject: `Spot Available: ${event.title}`,
      template: EmailTemplates.WAITLIST_NOTIFICATION,
      variables: {
        attendeeName: waitlistedUser.name,
        eventTitle: event.title,
        eventDate: new Date(event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        }),
        eventVenue: event.venue,
        registrationUrl: `${window.location.origin}/events/${event.title}` // You might want to use event ID
      }
    };

    const result = await this.sendEmail(emailData);
    return result.success;
  }

  // Send cancellation confirmation
  static async sendCancellationConfirmation(registration: {
    name: string;
    email: string;
    event: {
      title: string;
      date: string;
    };
    refundAmount?: number;
  }): Promise<boolean> {
    const emailData: EmailData = {
      to: [registration.email],
      subject: `Cancellation Confirmed: ${registration.event.title}`,
      template: EmailTemplates.CANCELLATION,
      variables: {
        attendeeName: registration.name,
        eventTitle: registration.event.title,
        eventDate: new Date(registration.event.date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        refundAmount: registration.refundAmount,
        hasRefund: registration.refundAmount !== undefined && registration.refundAmount > 0
      }
    };

    const result = await this.sendEmail(emailData);
    return result.success;
  }

  // Get email templates
  static async getTemplates(): Promise<Array<{
    id: string;
    name: string;
    subject: string;
    description: string;
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/emails/templates`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
        }
      });

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('Email templates not available, using defaults:', error);
      
      // Return default templates for demo
      return [
        { 
          id: EmailTemplates.REGISTRATION_CONFIRMATION, 
          name: 'Registration Confirmation',
          subject: 'Registration Confirmed',
          description: 'Sent when user registers for an event'
        },
        { 
          id: EmailTemplates.EVENT_REMINDER, 
          name: 'Event Reminder',
          subject: 'Event Reminder',
          description: 'Sent 24 hours before event'
        },
        { 
          id: EmailTemplates.EVENT_UPDATE, 
          name: 'Event Update',
          subject: 'Event Update',
          description: 'Sent when event details change'
        },
        { 
          id: EmailTemplates.CANCELLATION, 
          name: 'Cancellation Confirmation',
          subject: 'Cancellation Confirmed',
          description: 'Sent when registration is cancelled'
        },
        { 
          id: EmailTemplates.WAITLIST_NOTIFICATION, 
          name: 'Waitlist Notification',
          subject: 'Spot Available',
          description: 'Sent when spot becomes available'
        }
      ];
    }
  }

  // Simulate email sending for demo purposes
  private static async simulateEmailSend(emailData: EmailData): Promise<void> {
    console.log('📧 Simulating email send:', {
      to: emailData.to,
      subject: emailData.subject,
      template: emailData.template,
      variables: emailData.variables
    });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // Simulate occasional failures (5% chance)
    if (Math.random() < 0.05) {
      throw new Error('Simulated email delivery failure');
    }

    toast.success(`Simulated: Email sent to ${emailData.to.join(', ')}`);
  }
}

// Email automation service
export class EmailAutomationService {
  // Setup automatic email sequences
  static setupEventReminders(eventId: string): void {
    console.log(`📅 Setting up email reminders for event ${eventId}`);
    
    // In a real implementation, this would schedule emails:
    // - 7 days before event
    // - 24 hours before event  
    // - 1 hour before event
    
    toast.info('Email reminders scheduled for this event');
  }

  // Setup follow-up emails
  static setupFollowUpSequence(eventId: string): void {
    console.log(`📬 Setting up follow-up sequence for event ${eventId}`);
    
    // In a real implementation, this would schedule:
    // - Thank you email (24 hours after event)
    // - Feedback survey (72 hours after event)
    // - Future event recommendations (1 week after event)
    
    toast.info('Follow-up email sequence activated');
  }
}

// Email analytics and tracking
export class EmailAnalyticsService {
  // Track email metrics
  static async getEmailMetrics(timeRange: 'week' | 'month' | 'quarter' = 'month'): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
  }> {
    try {
      const response = await fetch(`${EmailService['baseUrl']}/api/emails/metrics?range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`
        }
      });

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.warn('Email analytics not available, using mock data:', error);
      
      // Return mock metrics for demo
      const sent = Math.floor(Math.random() * 1000) + 500;
      const delivered = Math.floor(sent * 0.95);
      const opened = Math.floor(delivered * 0.35);
      const clicked = Math.floor(opened * 0.15);
      const bounced = sent - delivered;
      const unsubscribed = Math.floor(sent * 0.002);

      return { sent, delivered, opened, clicked, bounced, unsubscribed };
    }
  }
}
