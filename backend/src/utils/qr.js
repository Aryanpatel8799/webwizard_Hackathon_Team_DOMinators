import QRCode from 'qrcode';
import PDFKit from 'pdfkit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import config from '../config/index.js';
import logger from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate QR code for registration ticket
 * @param {Object} ticketData - Data to encode in QR code
 * @returns {Promise<string>} - Base64 data URL of QR code
 */
export const generateTicketQR = async (ticketData) => {
  try {
    const qrData = JSON.stringify({
      registrationId: ticketData.registrationId,
      eventId: ticketData.eventId,
      email: ticketData.email,
      name: ticketData.name,
      timestamp: Date.now(),
      checksum: await generateChecksum(ticketData)
    });
    
    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'M',
      type: 'image/png',
      quality: 0.92,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      width: 256
    });
    
    return qrCodeDataURL;
  } catch (error) {
    logger.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate PDF ticket with QR code
 * @param {Object} ticketData - Ticket information
 * @param {string} qrCodeDataURL - QR code data URL
 * @returns {Promise<Buffer>} - PDF buffer
 */
export const generatePDFTicket = async (ticketData, qrCodeDataURL) => {
  return new Promise((resolve, reject) => {
    try {
            // Create PDF document
      const doc = new PDFKit({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Header
      doc.fontSize(24)
         .fillColor('#2c3e50')
         .text('EVENT TICKET', { align: 'center' });
      
      doc.moveDown(0.5);
      
      // Event details
      doc.fontSize(18)
         .fillColor('#34495e')
         .text(ticketData.eventTitle, { align: 'center' });
      
      doc.moveDown(0.5);
      
      // Ticket info box
      const boxY = doc.y;
      doc.rect(50, boxY, doc.page.width - 100, 200)
         .stroke('#bdc3c7');
      
      // Participant details
      doc.fontSize(12)
         .fillColor('#2c3e50')
         .text('PARTICIPANT DETAILS', 70, boxY + 20, { underline: true });
      
      doc.fontSize(10)
         .fillColor('#34495e')
         .text(`Name: ${ticketData.name}`, 70, boxY + 40)
         .text(`Email: ${ticketData.email}`, 70, boxY + 55)
         .text(`Registration ID: ${ticketData.registrationNumber}`, 70, boxY + 70);
      
      if (ticketData.college) {
        doc.text(`College: ${ticketData.college}`, 70, boxY + 85);
      }
      
      // Event details
      doc.fontSize(12)
         .fillColor('#2c3e50')
         .text('EVENT DETAILS', 70, boxY + 110, { underline: true });
      
      doc.fontSize(10)
         .fillColor('#34495e')
         .text(`Event: ${ticketData.eventTitle}`, 70, boxY + 130)
         .text(`Date: ${new Date(ticketData.eventDate).toLocaleDateString()}`, 70, boxY + 145)
         .text(`Time: ${new Date(ticketData.eventDate).toLocaleTimeString()}`, 70, boxY + 160)
         .text(`Venue: ${ticketData.venue}`, 70, boxY + 175);
      
      // QR Code
      if (qrCodeDataURL) {
        const qrBuffer = Buffer.from(qrCodeDataURL.split(',')[1], 'base64');
        doc.image(qrBuffer, doc.page.width - 170, boxY + 20, { width: 100 });
        
        doc.fontSize(8)
           .fillColor('#7f8c8d')
           .text('Scan QR code for verification', doc.page.width - 170, boxY + 130, { width: 100, align: 'center' });
      }
      
      doc.moveDown(3);
      
      // Instructions
      doc.fontSize(10)
         .fillColor('#e74c3c')
         .text('IMPORTANT INSTRUCTIONS:', { underline: true });
      
      doc.fontSize(9)
         .fillColor('#2c3e50')
         .text('• Please bring this ticket (digital or printed) to the event')
         .text('• Arrive at least 15 minutes before the event starts')
         .text('• Present a valid ID along with this ticket')
         .text('• This ticket is non-transferable and non-refundable');
      
      // Footer
      doc.moveDown(2);
      doc.fontSize(8)
         .fillColor('#95a5a6')
         .text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' })
         .text(`Ticket ID: ${ticketData.registrationId}`, { align: 'center' });
      
      doc.end();
    } catch (error) {
      logger.error('Error generating PDF ticket:', error);
      reject(new Error('Failed to generate PDF ticket'));
    }
  });
};

/**
 * Save ticket file to disk
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} filename - Filename
 * @returns {Promise<string>} - File path
 */
export const saveTicketFile = async (fileBuffer, filename) => {
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'tickets');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, fileBuffer);
    
    return filePath;
  } catch (error) {
    logger.error('Error saving ticket file:', error);
    throw new Error('Failed to save ticket file');
  }
};

/**
 * Generate checksum for ticket verification
 * @param {Object} ticketData - Ticket data
 * @returns {string} - Checksum
 */
const generateChecksum = async (ticketData) => {
  const crypto = await import('crypto');
  const data = `${ticketData.registrationId}-${ticketData.eventId}-${ticketData.email}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
};

/**
 * Verify QR code data
 * @param {string} qrData - QR code data (JSON string)
 * @returns {Object|null} - Parsed and verified data or null if invalid
 */
export const verifyQRCode = async (qrData) => {
  try {
    const data = JSON.parse(qrData);
    
    // Verify required fields
    if (!data.registrationId || !data.eventId || !data.email || !data.checksum) {
      return null;
    }
    
    // Verify checksum
    const expectedChecksum = await generateChecksum({
      registrationId: data.registrationId,
      eventId: data.eventId,
      email: data.email
    });
    
    if (data.checksum !== expectedChecksum) {
      return null;
    }
    
    return data;
  } catch (error) {
    logger.error('Error verifying QR code:', error);
    return null;
  }
};

/**
 * Generate ticket for registration
 * @param {Object} registration - Registration object
 * @param {Object} event - Event object
 * @returns {Promise<Object>} - Ticket data with QR code
 */
export const generateTicket = async (registration, event) => {
  try {
    const ticketData = {
      registrationId: registration._id.toString(),
      registrationNumber: registration.registrationNumber,
      eventId: event._id.toString(),
      eventTitle: event.title,
      eventDate: event.date,
      venue: event.venue,
      name: registration.name,
      email: registration.email,
      college: registration.college
    };
    
    // Generate QR code
    const qrCodeDataURL = await generateTicketQR(ticketData);
    
    return {
      ...ticketData,
      qrCode: qrCodeDataURL
    };
  } catch (error) {
    logger.error('Error generating ticket:', error);
    throw new Error('Failed to generate ticket');
  }
};

export default {
  generateTicketQR,
  generatePDFTicket,
  saveTicketFile,
  verifyQRCode,
  generateTicket
};
