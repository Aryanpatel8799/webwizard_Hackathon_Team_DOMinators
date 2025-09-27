import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../utils/logger.js';

class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.initialize();
  }

  async initialize() {
    try {
      logger.info('Initializing email service...');
      
      if (config.email.sendgrid.apiKey) {
        // Use SendGrid
        const sgMail = await import('@sendgrid/mail');
        sgMail.setApiKey(config.email.sendgrid.apiKey);
        this.provider = 'sendgrid';
        this.sgMail = sgMail;
        logger.info('Email service initialized with SendGrid');
      } else if (config.email.smtp.host && config.email.smtp.user) {
        // Use SMTP (Nodemailer)
        this.transporter = nodemailer.createTransport({
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          secure: config.email.smtp.port === 465,
          auth: {
            user: config.email.smtp.user,
            pass: config.email.smtp.pass
          }
        });
        
        // Verify connection
        await this.transporter.verify();
        this.provider = 'smtp';
        logger.info('Email service initialized with SMTP', { 
          host: config.email.smtp.host,
          port: config.email.smtp.port 
        });
      } else {
        logger.warn('No email configuration found. Email features will be disabled.', {
          hasHost: !!config.email.smtp.host,
          hasUser: !!config.email.smtp.user,
          host: config.email.smtp.host,
          user: config.email.smtp.user
        });
        return;
      }
      
      this.isInitialized = true;
      logger.info(`Email service initialized with ${this.provider}`);
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.isInitialized = false;
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    if (!this.isInitialized) {
      logger.warn('Email service not initialized. Skipping email send.');
      return { success: false, error: 'Email service not configured' };
    }

    try {
      const emailData = {
        to,
        from: config.email.from,
        subject,
        html,
        text: text || this.extractTextFromHtml(html),
        attachments
      };

      if (this.provider === 'sendgrid') {
        await this.sgMail.send(emailData);
      } else if (this.provider === 'smtp') {
        await this.transporter.sendMail(emailData);
      }

      logger.info(`Email sent successfully to ${to}`);
      return { success: true };
    } catch (error) {
      logger.error('Failed to send email:', error);
      return { success: false, error: error.message };
    }
  }

  async sendRegistrationConfirmation(registration, event) {
    const subject = `Registration Confirmed - ${event.title}`;
    const html = this.getRegistrationConfirmationTemplate(registration, event);
    
    return await this.sendEmail({
      to: registration.email,
      subject,
      html
    });
  }

  async sendWaitingListNotification(registration, event, position) {
    const subject = `You're on the waiting list - ${event.title}`;
    const html = this.getWaitingListTemplate(registration, event, position);
    
    return await this.sendEmail({
      to: registration.email,
      subject,
      html
    });
  }

  async sendPromotionNotification(registration, event, ticketQR = null) {
    const subject = `Great news! You've been confirmed - ${event.title}`;
    const html = this.getPromotionTemplate(registration, event);
    
    const attachments = [];
    if (ticketQR) {
      attachments.push({
        filename: `ticket-${registration.registrationNumber}.png`,
        content: ticketQR.split(',')[1],
        encoding: 'base64',
        cid: 'ticket-qr'
      });
    }
    
    return await this.sendEmail({
      to: registration.email,
      subject,
      html,
      attachments
    });
  }

  async sendCancellationNotification(registration, event) {
    const subject = `Registration Cancelled - ${event.title}`;
    const html = this.getCancellationTemplate(registration, event);
    
    return await this.sendEmail({
      to: registration.email,
      subject,
      html
    });
  }

  async sendBulkImportSummary(adminEmail, eventTitle, summary) {
    const subject = `Import Summary - ${eventTitle}`;
    const html = this.getBulkImportTemplate(eventTitle, summary);
    
    return await this.sendEmail({
      to: adminEmail,
      subject,
      html
    });
  }

  // Email Templates
  getRegistrationConfirmationTemplate(registration, event) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .event-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .success-icon { font-size: 48px; color: #28a745; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>You're all set for ${event.title}</p>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <p>Dear ${registration.name},</p>
            <p>Great news! Your registration has been <strong>confirmed</strong> for the upcoming event.</p>
            
            <div class="event-details">
              <h3>Event Details</h3>
              <p><strong>Event:</strong> ${event.title}</p>
              <p><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${new Date(event.date).toLocaleTimeString()}</p>
              <p><strong>Venue:</strong> ${event.venue}</p>
              <p><strong>Registration ID:</strong> ${registration.registrationNumber}</p>
            </div>

            <p><strong>Important Instructions:</strong></p>
            <ul>
              <li>Please arrive at least 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Keep this registration number handy: <strong>${registration.registrationNumber}</strong></li>
            </ul>

            <p>If you have any questions, feel free to contact us.</p>
            
            <div class="footer">
              <p>Thank you for registering!</p>
              <p><em>The Event Team</em></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getWaitingListTemplate(registration, event, position) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You're on the Waiting List</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffeaa7 0%, #fab1a0 100%); color: #2d3436; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .waiting-info { background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .position { font-size: 24px; font-weight: bold; color: #e17055; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏳ You're on the Waiting List</h1>
            <p>We've received your registration for ${event.title}</p>
          </div>
          <div class="content">
            <p>Dear ${registration.name},</p>
            <p>Thank you for your interest in <strong>${event.title}</strong>. The event is currently at full capacity, but we've added you to our waiting list.</p>
            
            <div class="waiting-info">
              <h3>Waiting List Information</h3>
              ${position ? `<div class="position">You are #${position} in line</div>` : ''}
              <p>We'll notify you immediately if a spot becomes available. Spots are offered on a first-come, first-served basis.</p>
              <p><strong>Registration ID:</strong> ${registration.registrationNumber}</p>
            </div>

            <p><strong>What happens next?</strong></p>
            <ul>
              <li>We'll monitor for any cancellations</li>
              <li>If a spot opens up, you'll receive an email within minutes</li>
              <li>You'll have priority based on your position in the waiting list</li>
            </ul>

            <p>We appreciate your patience and hope to see you at the event!</p>
            
            <div style="text-align: center; margin-top: 30px; color: #666;">
              <p>Keep an eye on your inbox - good things come to those who wait!</p>
              <p><em>The Event Team</em></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getPromotionTemplate(registration, event) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been promoted!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .promotion-banner { background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; text-align: center; }
          .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations!</h1>
            <p>You've been promoted from the waiting list</p>
          </div>
          <div class="content">
            <div class="celebration">🎊 🎉 🎊</div>
            <p>Dear ${registration.name},</p>
            <p><strong>Great news!</strong> A spot has opened up for <strong>${event.title}</strong> and you've been promoted from the waiting list.</p>
            
            <div class="promotion-banner">
              <h3>🎯 Your Registration is Now CONFIRMED!</h3>
              <p>Registration ID: <strong>${registration.registrationNumber}</strong></p>
            </div>

            <p><strong>Event Details:</strong></p>
            <ul>
              <li><strong>Event:</strong> ${event.title}</li>
              <li><strong>Date:</strong> ${new Date(event.date).toLocaleDateString()}</li>
              <li><strong>Time:</strong> ${new Date(event.date).toLocaleTimeString()}</li>
              <li><strong>Venue:</strong> ${event.venue}</li>
            </ul>

            <p><strong>Important Reminders:</strong></p>
            <ul>
              <li>Please arrive at least 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Your ticket QR code is attached (if applicable)</li>
            </ul>

            <p>We're excited to see you at the event!</p>
            
            <div style="text-align: center; margin-top: 30px; color: #666;">
              <p>Thank you for your patience!</p>
              <p><em>The Event Team</em></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getCancellationTemplate(registration, event) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Cancelled</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Registration Cancelled</h1>
            <p>${event.title}</p>
          </div>
          <div class="content">
            <p>Dear ${registration.name},</p>
            <p>Your registration for <strong>${event.title}</strong> has been cancelled as requested.</p>
            <p><strong>Registration ID:</strong> ${registration.registrationNumber}</p>
            <p>If this was done in error, please contact us immediately.</p>
            <p>Thank you for your interest in our events.</p>
            
            <div style="text-align: center; margin-top: 30px; color: #666;">
              <p><em>The Event Team</em></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getBulkImportTemplate(eventTitle, summary) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Import Summary</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .summary { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .stat { display: inline-block; margin: 10px 20px 10px 0; padding: 10px; background: white; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>CSV Import Summary - ${eventTitle}</h2>
          <div class="summary">
            <h3>Import Results:</h3>
            <div class="stat"><strong>Total Processed:</strong> ${summary.total}</div>
            <div class="stat"><strong>Successful:</strong> ${summary.successful}</div>
            <div class="stat"><strong>Failed:</strong> ${summary.failed}</div>
            <div class="stat"><strong>Confirmed:</strong> ${summary.confirmed}</div>
            <div class="stat"><strong>Waiting List:</strong> ${summary.waiting}</div>
          </div>
          ${summary.errors && summary.errors.length > 0 ? `
            <h3>Errors:</h3>
            <ul>
              ${summary.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          ` : ''}
          <p>Import completed at: ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  extractTextFromHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

export default new EmailService();
