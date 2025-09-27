import * as csvWriter from 'csv-writer';
import { parse as csvParse } from 'csv-parse';
import fs from 'fs';
import path from 'path';
import { Event, Registration } from '../models/index.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';
import { formatDate } from '../utils/helpers.js';

class CSVService {
  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'csv');
    this.ensureUploadDir();
  }

  ensureUploadDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Export event registrations to CSV
   * @param {string} eventId - Event ID
   * @param {Object} options - Export options
   * @returns {Promise<string>} - File path of generated CSV
   */
  async exportRegistrations(eventId, options = {}) {
    try {
      const {
        status = null,
        includeMetadata = false,
        filename = null
      } = options;

      // Get event and registrations
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const query = { event: eventId };
      if (status) {
        query.status = status;
      }

      const registrations = await Registration.find(query)
        .sort({ createdAt: 1 })
        .populate('event', 'title date venue');

      // Define CSV headers
      const headers = [
        { id: 'registrationNumber', title: 'Registration Number' },
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone', title: 'Phone' },
        { id: 'college', title: 'College' },
        { id: 'status', title: 'Status' },
        { id: 'createdAt', title: 'Registration Date' }
      ];

      if (includeMetadata) {
        headers.push(
          { id: 'ipAddress', title: 'IP Address' },
          { id: 'userAgent', title: 'User Agent' },
          { id: 'source', title: 'Source' }
        );
      }

      // Generate filename
      const sanitizedEventTitle = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().toISOString().split('T')[0];
      const csvFilename = filename || `${sanitizedEventTitle}_registrations_${status || 'all'}_${timestamp}.csv`;
      const filePath = path.join(this.uploadsDir, csvFilename);

      // Create CSV writer
      const writer = csvWriter.createObjectCsvWriter({
        path: filePath,
        header: headers
      });

      // Prepare data
      const data = registrations.map(reg => ({
        registrationNumber: reg.registrationNumber,
        name: reg.name,
        email: reg.email,
        phone: reg.phone || '',
        college: reg.college || '',
        status: reg.status,
        createdAt: formatDate(reg.createdAt),
        ...(includeMetadata && {
          ipAddress: reg.meta?.ipAddress || '',
          userAgent: reg.meta?.userAgent || '',
          source: reg.meta?.source || 'web'
        })
      }));

      // Write CSV
      await writer.writeRecords(data);

      logger.info(`Exported ${data.length} registrations to CSV: ${csvFilename}`);

      return {
        filePath,
        filename: csvFilename,
        recordCount: data.length,
        event: {
          title: event.title,
          date: event.date
        }
      };
    } catch (error) {
      logger.error('Error exporting registrations to CSV:', error);
      throw error;
    }
  }

  /**
   * Import registrations from CSV
   * @param {string} filePath - Path to CSV file
   * @param {string} eventId - Event ID
   * @param {Object} options - Import options
   * @returns {Promise<Object>} - Import summary
   */
  async importRegistrations(filePath, eventId, options = {}) {
    try {
      const {
        skipDuplicates = true,
        sendEmails = true,
        defaultSource = 'import'
      } = options;

      // Validate event
      const event = await Event.findById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Read and parse CSV
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const records = await this.parseCSV(fileContent);

      const summary = {
        total: records.length,
        successful: 0,
        failed: 0,
        confirmed: 0,
        waiting: 0,
        skipped: 0,
        errors: []
      };

      // Process each record
      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const rowNumber = i + 2; // Account for header row

        try {
          // Validate required fields
          const validation = this.validateCSVRecord(record);
          if (!validation.isValid) {
            summary.errors.push(`Row ${rowNumber}: ${validation.errors.join(', ')}`);
            summary.failed++;
            continue;
          }

          // Check for existing registration
          const existingReg = await Registration.findOne({
            event: eventId,
            email: validation.data.email
          });

          if (existingReg && skipDuplicates) {
            summary.skipped++;
            continue;
          }

          // Determine status based on capacity
          const currentCount = await Registration.countDocuments({
            event: eventId,
            status: 'confirmed'
          });

          const status = currentCount < event.capacity ? 'confirmed' : 'waiting';

          // Create registration
          const registrationData = {
            ...validation.data,
            event: eventId,
            status,
            meta: {
              source: defaultSource,
              importTimestamp: new Date(),
              rowNumber
            }
          };

          const registration = new Registration(registrationData);
          await registration.save();

          // Update event attendees count if confirmed
          if (status === 'confirmed') {
            await Event.findByIdAndUpdate(eventId, {
              $inc: { attendeesCount: 1 }
            });
            summary.confirmed++;
          } else {
            summary.waiting++;
          }

          // Send email notification
          if (sendEmails) {
            try {
              if (status === 'confirmed') {
                await emailService.sendRegistrationConfirmation(registration, event);
              } else {
                const position = await Registration.getWaitingPosition(eventId, registration._id);
                await emailService.sendWaitingListNotification(registration, event, position);
              }
            } catch (emailError) {
              logger.warn(`Failed to send email to ${registration.email}:`, emailError);
            }
          }

          summary.successful++;
          logger.debug(`Imported registration for ${validation.data.email} with status ${status}`);

        } catch (error) {
          logger.error(`Error processing row ${rowNumber}:`, error);
          summary.errors.push(`Row ${rowNumber}: ${error.message}`);
          summary.failed++;
        }
      }

      // Clean up uploaded file
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.warn('Failed to clean up uploaded file:', cleanupError);
      }

      logger.info(`CSV import completed. Successful: ${summary.successful}, Failed: ${summary.failed}`);

      return summary;
    } catch (error) {
      logger.error('Error importing CSV:', error);
      throw error;
    }
  }

  /**
   * Parse CSV content
   * @param {string} csvContent - CSV file content
   * @returns {Promise<Array>} - Parsed records
   */
  async parseCSV(csvContent) {
    return new Promise((resolve, reject) => {
      const records = [];
      
      const parser = csvParse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true
      });

      parser.on('readable', function() {
        let record;
        while (record = parser.read()) {
          records.push(record);
        }
      });

      parser.on('error', function(err) {
        reject(err);
      });

      parser.on('end', function() {
        resolve(records);
      });

      parser.write(csvContent);
      parser.end();
    });
  }

  /**
   * Validate CSV record
   * @param {Object} record - CSV record
   * @returns {Object} - Validation result
   */
  validateCSVRecord(record) {
    const errors = [];
    const data = {};

    // Required fields
    if (!record.name || record.name.trim().length === 0) {
      errors.push('Name is required');
    } else {
      data.name = record.name.trim();
    }

    if (!record.email || record.email.trim().length === 0) {
      errors.push('Email is required');
    } else {
      const email = record.email.trim().toLowerCase();
      const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        errors.push('Invalid email format');
      } else {
        data.email = email;
      }
    }

    // Optional fields
    if (record.phone && record.phone.trim().length > 0) {
      data.phone = record.phone.trim();
    }

    if (record.college && record.college.trim().length > 0) {
      data.college = record.college.trim();
    }

    return {
      isValid: errors.length === 0,
      errors,
      data
    };
  }

  /**
   * Generate CSV template for imports
   * @returns {Promise<string>} - Path to template file
   */
  async generateImportTemplate() {
    try {
      const templatePath = path.join(this.uploadsDir, 'registration_import_template.csv');
      
      const writer = csvWriter.createObjectCsvWriter({
        path: templatePath,
        header: [
          { id: 'name', title: 'name' },
          { id: 'email', title: 'email' },
          { id: 'phone', title: 'phone' },
          { id: 'college', title: 'college' }
        ]
      });

      // Sample data
      const sampleData = [
        {
          name: 'John Doe',
          email: 'john.doe@example.com',
          phone: '+1234567890',
          college: 'Sample University'
        },
        {
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          phone: '+1234567891',
          college: 'Another College'
        }
      ];

      await writer.writeRecords(sampleData);

      return {
        filePath: templatePath,
        filename: 'registration_import_template.csv'
      };
    } catch (error) {
      logger.error('Error generating CSV template:', error);
      throw error;
    }
  }

  /**
   * Get CSV file for download
   * @param {string} filename - CSV filename
   * @returns {Object} - File info
   */
  getCSVFile(filename) {
    const filePath = path.join(this.uploadsDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('CSV file not found');
    }

    const stats = fs.statSync(filePath);
    
    return {
      filePath,
      filename,
      size: stats.size,
      mimeType: 'text/csv'
    };
  }

  /**
   * Clean up old CSV files
   * @param {number} maxAge - Maximum age in hours (default: 24 hours)
   * @returns {Promise<number>} - Number of files cleaned up
   */
  async cleanupOldFiles(maxAge = 24) {
    try {
      const files = fs.readdirSync(this.uploadsDir);
      const maxAgeMs = maxAge * 60 * 60 * 1000;
      let cleanedUp = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (Date.now() - stats.mtime.getTime() > maxAgeMs) {
          fs.unlinkSync(filePath);
          cleanedUp++;
          logger.debug(`Cleaned up old CSV file: ${file}`);
        }
      }

      if (cleanedUp > 0) {
        logger.info(`Cleaned up ${cleanedUp} old CSV files`);
      }

      return cleanedUp;
    } catch (error) {
      logger.error('Error cleaning up old CSV files:', error);
      return 0;
    }
  }
}

export default new CSVService();
