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
    
    // Generate QR code for the registration
    let qrCodeDataURL = null;
    try {
      const { generateTicketQR } = await import('../utils/qr.js');
      const ticketData = {
        registrationId: registration._id.toString(),
        eventId: event._id.toString(),
        email: registration.email,
        name: registration.name
      };
      qrCodeDataURL = await generateTicketQR(ticketData);
    } catch (error) {
      logger.warn('Failed to generate QR code for registration confirmation:', error);
    }
    
    const html = this.getRegistrationConfirmationTemplate(registration, event, qrCodeDataURL);
    
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
    
    // Generate QR code if not provided
    let qrCodeDataURL = ticketQR;
    if (!qrCodeDataURL) {
      try {
        const { generateTicketQR } = await import('../utils/qr.js');
        const ticketData = {
          registrationId: registration._id.toString(),
          eventId: event._id.toString(),
          email: registration.email,
          name: registration.name
        };
        qrCodeDataURL = await generateTicketQR(ticketData);
      } catch (error) {
        logger.warn('Failed to generate QR code for promotion notification:', error);
      }
    }
    
    const html = this.getPromotionTemplate(registration, event, qrCodeDataURL);
    
    return await this.sendEmail({
      to: registration.email,
      subject,
      html
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
  getRegistrationConfirmationTemplate(registration, event, qrCodeDataURL = null) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Confirmed</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          .header h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px; 
            position: relative;
            z-index: 1;
          }
          .header p { 
            font-size: 1.1rem; 
            opacity: 0.9; 
            position: relative;
            z-index: 1;
          }
          .content { 
            padding: 40px 30px; 
            background: #fafbfc;
          }
          .success-badge {
            display: inline-flex;
            align-items: center;
            background: linear-gradient(135deg, #00b894, #00cec9);
            color: white;
            padding: 12px 24px;
            border-radius: 50px;
            font-weight: 600;
            margin: 20px 0;
            box-shadow: 0 4px 15px rgba(0, 184, 148, 0.3);
          }
          .event-card { 
            background: white; 
            padding: 30px; 
            border-radius: 16px; 
            margin: 30px 0; 
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
          }
          .event-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
          }
          .event-card h3 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .event-detail {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #f8f9fa;
          }
          .event-detail:last-child {
            border-bottom: none;
          }
          .event-detail-icon {
            width: 20px;
            height: 20px;
            margin-right: 15px;
            opacity: 0.7;
          }
          .event-detail-content {
            flex: 1;
          }
          .event-detail-label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .event-detail-value {
            color: #2c3e50;
            font-size: 1rem;
            margin-top: 2px;
          }
          .qr-section {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 30px;
            border-radius: 16px;
            margin: 30px 0;
            text-align: center;
            border: 2px dashed #dee2e6;
          }
          .qr-code {
            max-width: 200px;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            margin: 20px 0;
          }
          .qr-text {
            color: #6c757d;
            font-size: 0.9rem;
            margin-top: 15px;
          }
          .instructions { 
            background: linear-gradient(135deg, #fff3cd, #ffeaa7); 
            padding: 25px; 
            border-radius: 12px; 
            margin: 30px 0; 
            border-left: 4px solid #ffc107;
          }
          .instructions h4 {
            color: #856404;
            margin-bottom: 15px;
            font-size: 1.1rem;
          }
          .instructions ul {
            list-style: none;
            padding: 0;
          }
          .instructions li {
            padding: 8px 0;
            color: #856404;
            position: relative;
            padding-left: 25px;
          }
          .instructions li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            color: #6c757d;
            margin: 5px 0;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 15px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .header h1 { font-size: 2rem; }
            .event-card { padding: 20px; }
            .qr-section { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Registration Confirmed!</h1>
            <p>You're all set for ${event.title}</p>
          </div>
          <div class="content">
            <div class="success-badge">
              ✅ Your registration is confirmed!
            </div>
            
            <p style="font-size: 1.1rem; color: #495057; margin-bottom: 30px;">
              Dear <strong>${registration.name}</strong>,<br>
              Great news! Your registration has been <strong>confirmed</strong> for the upcoming event.
            </p>
            
            <div class="event-card">
              <h3>📅 Event Details</h3>
              <div class="event-detail">
                <div class="event-detail-icon">🎪</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Event</div>
                  <div class="event-detail-value">${event.title}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">📅</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Date</div>
                  <div class="event-detail-value">${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">🕐</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Time</div>
                  <div class="event-detail-value">${new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">📍</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Venue</div>
                  <div class="event-detail-value">${event.venue}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">🎫</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Registration ID</div>
                  <div class="event-detail-value"><strong>${registration.registrationNumber}</strong></div>
                </div>
              </div>
            </div>

            ${qrCodeDataURL ? `
            <div class="qr-section">
              <h4 style="color: #495057; margin-bottom: 15px;">📱 Your Digital Ticket</h4>
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" style="display: block; margin: 0 auto;" />
              <p class="qr-text">Show this QR code at the event entrance for quick check-in</p>
            </div>
            ` : ''}

            <div class="instructions">
              <h4>📋 Important Instructions</h4>
            <ul>
              <li>Please arrive at least 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
                <li>Keep your registration number handy: <strong>${registration.registrationNumber}</strong></li>
                <li>Save this email or take a screenshot for easy access</li>
                <li>Contact us if you have any questions or need to make changes</li>
            </ul>
            </div>

            <p style="color: #6c757d; font-size: 1rem; margin-top: 30px;">
              We're excited to see you at the event! If you have any questions, feel free to contact us.
            </p>
            
            <div class="footer">
              <p><strong>Thank you for registering!</strong></p>
              <p><em>The Event Team</em></p>
              <div class="social-links">
                <a href="#">Website</a> • 
                <a href="#">Support</a> • 
                <a href="#">Contact</a>
              </div>
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

  getPromotionTemplate(registration, event, qrCodeDataURL = null) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>You've been promoted!</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #00b894 0%, #00cec9 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          .header h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px; 
            position: relative;
            z-index: 1;
          }
          .header p { 
            font-size: 1.1rem; 
            opacity: 0.9; 
            position: relative;
            z-index: 1;
          }
          .content { 
            padding: 40px 30px; 
            background: #fafbfc;
          }
          .celebration { 
            font-size: 3rem; 
            text-align: center; 
            margin: 30px 0;
            animation: bounce 2s infinite;
          }
          .promotion-banner { 
            background: linear-gradient(135deg, #d4edda, #c3e6cb); 
            padding: 30px; 
            border-radius: 16px; 
            margin: 30px 0; 
            border: 2px solid #28a745;
            text-align: center;
            position: relative;
            overflow: hidden;
          }
          .promotion-banner::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(40, 167, 69, 0.1) 0%, transparent 70%);
            animation: pulse 3s ease-in-out infinite;
          }
          .promotion-banner h3 {
            color: #155724;
            font-size: 1.5rem;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
          }
          .promotion-banner p {
            color: #155724;
            font-size: 1.1rem;
            position: relative;
            z-index: 1;
          }
          .event-card { 
            background: white; 
            padding: 30px; 
            border-radius: 16px; 
            margin: 30px 0; 
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
          }
          .event-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #00b894, #00cec9);
          }
          .event-card h3 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .event-detail {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #f8f9fa;
          }
          .event-detail:last-child {
            border-bottom: none;
          }
          .event-detail-icon {
            width: 20px;
            height: 20px;
            margin-right: 15px;
            opacity: 0.7;
          }
          .event-detail-content {
            flex: 1;
          }
          .event-detail-label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .event-detail-value {
            color: #2c3e50;
            font-size: 1rem;
            margin-top: 2px;
          }
          .qr-section {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 30px;
            border-radius: 16px;
            margin: 30px 0;
            text-align: center;
            border: 2px dashed #dee2e6;
          }
          .qr-code {
            max-width: 200px;
            height: auto;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.1);
            margin: 20px 0;
          }
          .qr-text {
            color: #6c757d;
            font-size: 0.9rem;
            margin-top: 15px;
          }
          .instructions { 
            background: linear-gradient(135deg, #fff3cd, #ffeaa7); 
            padding: 25px; 
            border-radius: 12px; 
            margin: 30px 0; 
            border-left: 4px solid #ffc107;
          }
          .instructions h4 {
            color: #856404;
            margin-bottom: 15px;
            font-size: 1.1rem;
          }
          .instructions ul {
            list-style: none;
            padding: 0;
          }
          .instructions li {
            padding: 8px 0;
            color: #856404;
            position: relative;
            padding-left: 25px;
          }
          .instructions li::before {
            content: '✓';
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            color: #6c757d;
            margin: 5px 0;
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.8; }
            100% { transform: scale(1); opacity: 0.5; }
          }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 15px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .header h1 { font-size: 2rem; }
            .event-card { padding: 20px; }
            .qr-section { padding: 20px; }
          }
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
            
            <p style="font-size: 1.1rem; color: #495057; margin-bottom: 30px;">
              Dear <strong>${registration.name}</strong>,<br>
              <strong>Great news!</strong> A spot has opened up for <strong>${event.title}</strong> and you've been promoted from the waiting list.
            </p>
            
            <div class="promotion-banner">
              <h3>🎯 Your Registration is Now CONFIRMED!</h3>
              <p>Registration ID: <strong>${registration.registrationNumber}</strong></p>
            </div>

            <div class="event-card">
              <h3>📅 Event Details</h3>
              <div class="event-detail">
                <div class="event-detail-icon">🎪</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Event</div>
                  <div class="event-detail-value">${event.title}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">📅</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Date</div>
                  <div class="event-detail-value">${new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">🕐</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Time</div>
                  <div class="event-detail-value">${new Date(event.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">📍</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Venue</div>
                  <div class="event-detail-value">${event.venue}</div>
                </div>
              </div>
            </div>

            ${qrCodeDataURL ? `
            <div class="qr-section">
              <h4 style="color: #495057; margin-bottom: 15px;">📱 Your Digital Ticket</h4>
              <img src="${qrCodeDataURL}" alt="QR Code" class="qr-code" style="display: block; margin: 0 auto;" />
              <p class="qr-text">Show this QR code at the event entrance for quick check-in</p>
            </div>
            ` : ''}

            <div class="instructions">
              <h4>📋 Important Reminders</h4>
            <ul>
              <li>Please arrive at least 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
                <li>Save this email or take a screenshot for easy access</li>
                <li>Contact us if you have any questions or need to make changes</li>
            </ul>
            </div>

            <p style="color: #6c757d; font-size: 1rem; margin-top: 30px;">
              We're excited to see you at the event! Thank you for your patience.
            </p>
            
            <div class="footer">
              <p><strong>Thank you for your patience!</strong></p>
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

  getEventUpdateTemplate(recipient, updateMessage) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Update</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          .header h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px; 
            position: relative;
            z-index: 1;
          }
          .header p { 
            font-size: 1.1rem; 
            opacity: 0.9; 
            position: relative;
            z-index: 1;
          }
          .content { 
            padding: 40px 30px; 
            background: #fafbfc;
          }
          .update-box { 
            background: linear-gradient(135deg, #e3f2fd, #bbdefb); 
            padding: 30px; 
            border-radius: 16px; 
            margin: 30px 0; 
            border: 2px solid #2196f3;
            position: relative;
            overflow: hidden;
          }
          .update-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #2196f3, #1976d2);
          }
          .update-box h3 {
            color: #0d47a1;
            margin-bottom: 15px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .update-box p {
            color: #0d47a1;
            font-size: 1.1rem;
            line-height: 1.8;
            margin: 0;
          }
          .event-card { 
            background: white; 
            padding: 30px; 
            border-radius: 16px; 
            margin: 30px 0; 
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
          }
          .event-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
          }
          .event-card h3 {
            color: #2c3e50;
            margin-bottom: 20px;
            font-size: 1.3rem;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .event-detail {
            display: flex;
            align-items: center;
            margin: 15px 0;
            padding: 10px 0;
            border-bottom: 1px solid #f8f9fa;
          }
          .event-detail:last-child {
            border-bottom: none;
          }
          .event-detail-icon {
            width: 20px;
            height: 20px;
            margin-right: 15px;
            opacity: 0.7;
          }
          .event-detail-content {
            flex: 1;
          }
          .event-detail-label {
            font-weight: 600;
            color: #495057;
            font-size: 0.9rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .event-detail-value {
            color: #2c3e50;
            font-size: 1rem;
            margin-top: 2px;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            color: #6c757d;
            margin: 5px 0;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 15px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .header h1 { font-size: 2rem; }
            .update-box { padding: 20px; }
            .event-card { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Event Update</h1>
            ${recipient.event ? `<p>${recipient.event.title}</p>` : ''}
          </div>
          <div class="content">
            <p style="font-size: 1.1rem; color: #495057; margin-bottom: 30px;">
              Dear <strong>${recipient.name}</strong>,<br>
              We have an important update regarding your event registration:
            </p>
            
            <div class="update-box">
              <h3>📋 Update Details</h3>
              <p>${updateMessage}</p>
            </div>

            ${recipient.event ? `
            <div class="event-card">
              <h3>📅 Event Details</h3>
              <div class="event-detail">
                <div class="event-detail-icon">🎪</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Event</div>
                  <div class="event-detail-value">${recipient.event.title}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">📅</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Date</div>
                  <div class="event-detail-value">${new Date(recipient.event.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
              </div>
              <div class="event-detail">
                <div class="event-detail-icon">📍</div>
                <div class="event-detail-content">
                  <div class="event-detail-label">Venue</div>
                  <div class="event-detail-value">${recipient.event.venue || 'TBA'}</div>
                </div>
              </div>
            </div>
            ` : ''}

            <p style="color: #6c757d; font-size: 1rem; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact us.
            </p>
            
            <div class="footer">
              <p><strong>Thank you for your participation!</strong></p>
              <p><em>The Event Team</em></p>
              <div class="social-links">
                <a href="#">Website</a> • 
                <a href="#">Support</a> • 
                <a href="#">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getEventReminderTemplate(recipient) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Reminder</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ffa726 0%, #ff7043 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .reminder-box { background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ff9800; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Event Reminder</h1>
            ${recipient.event ? `<p>${recipient.event.title}</p>` : ''}
          </div>
          <div class="content">
            <p>Dear ${recipient.name},</p>
            <p>This is a friendly reminder about your upcoming event:</p>
            
            ${recipient.event ? `
              <div class="reminder-box">
                <h3>Event Details:</h3>
                <ul>
                  <li><strong>Event:</strong> ${recipient.event.title}</li>
                  <li><strong>Date:</strong> ${new Date(recipient.event.date).toLocaleDateString()}</li>
                  <li><strong>Venue:</strong> ${recipient.event.venue || 'TBA'}</li>
                </ul>
              </div>
            ` : ''}

            <p><strong>Important reminders:</strong></p>
            <ul>
              <li>Please arrive at least 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Check your email for any last-minute updates</li>
            </ul>

            <p>We're excited to see you at the event!</p>
            
            <div class="footer">
              <p>See you soon!</p>
              <p><em>The Event Team</em></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getGeneralTemplate(recipientName, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message from Event Team</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
            line-height: 1.6; 
            color: #2c3e50; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 20px; 
            overflow: hidden; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            position: relative;
          }
          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
          }
          .header h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px; 
            position: relative;
            z-index: 1;
          }
          .content { 
            padding: 40px 30px; 
            background: #fafbfc;
          }
          .message-box { 
            background: white; 
            padding: 30px; 
            border-radius: 16px; 
            margin: 30px 0; 
            border: 1px solid #e9ecef;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            position: relative;
            overflow: hidden;
          }
          .message-box::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(135deg, #667eea, #764ba2);
          }
          .message-box p {
            font-size: 1.1rem;
            line-height: 1.8;
            color: #2c3e50;
            margin: 0;
          }
          .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 30px;
            background: #f8f9fa;
            border-top: 1px solid #e9ecef;
          }
          .footer p {
            color: #6c757d;
            margin: 5px 0;
          }
          .social-links {
            margin: 20px 0;
          }
          .social-links a {
            display: inline-block;
            margin: 0 10px;
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
          }
          @media (max-width: 600px) {
            .container { margin: 10px; border-radius: 15px; }
            .header { padding: 30px 20px; }
            .content { padding: 30px 20px; }
            .header h1 { font-size: 2rem; }
            .message-box { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📧 Message from Event Team</h1>
          </div>
          <div class="content">
            <p style="font-size: 1.1rem; color: #495057; margin-bottom: 30px;">
              Dear <strong>${recipientName}</strong>,
            </p>
            
            <div class="message-box">
              <p>${message}</p>
            </div>

            <p style="color: #6c757d; font-size: 1rem; margin-top: 30px;">
              If you have any questions, please don't hesitate to contact us.
            </p>
            
            <div class="footer">
              <p><strong>Best regards,</strong></p>
              <p><em>The Event Team</em></p>
              <div class="social-links">
                <a href="#">Website</a> • 
                <a href="#">Support</a> • 
                <a href="#">Contact</a>
              </div>
            </div>
          </div>
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
