import { toast } from 'sonner';

// CSV Export functionality
export class CSVExportService {
  
  // Export events to CSV
  static exportEvents(events: any[]): void {
    const csvData = [
      ['Event ID', 'Title', 'Description', 'Date', 'Venue', 'Capacity', 'Registered', 'Status', 'Category'],
      ...events.map(event => [
        event._id || event.id,
        event.title || event.name,
        event.description?.replace(/,/g, ';') || '', // Replace commas to avoid CSV issues
        new Date(event.date).toLocaleDateString(),
        event.venue || event.location,
        event.capacity,
        event.attendeesCount || event.registeredCount || 0,
        event.isActive ? 'Active' : 'Inactive',
        event.category || 'General'
      ])
    ];

    this.downloadCSV(csvData, 'events');
    toast.success('Events exported to CSV successfully!');
  }

  // Export registrations to CSV
  static exportRegistrations(registrations: any[]): void {
    const csvData = [
      ['Registration ID', 'Name', 'Email', 'Event', 'Registration Date', 'Status', 'Phone', 'Company'],
      ...registrations.map(reg => [
        reg._id || reg.id,
        reg.name,
        reg.email,
        reg.event?.title || reg.eventName || 'Unknown Event',
        new Date(reg.createdAt || reg.registrationDate).toLocaleDateString(),
        reg.status || 'confirmed',
        reg.phone || '',
        reg.company || ''
      ])
    ];

    this.downloadCSV(csvData, 'registrations');
    toast.success('Registrations exported to CSV successfully!');
  }

  // Export analytics data
  static exportAnalytics(analytics: any): void {
    const csvData = [
      ['Metric', 'Value', 'Growth %'],
      ['Total Events', analytics.totalEvents, analytics.eventsGrowth || 0],
      ['Total Registrations', analytics.totalRegistrations, analytics.registrationsGrowth || 0],
      ['Total Revenue', `$${analytics.totalRevenue}`, analytics.revenueGrowth || 0],
      ['Active Events', analytics.activeEvents, ''],
      ['Average Event Size', Math.round(analytics.totalRegistrations / analytics.totalEvents) || 0, ''],
      ['Revenue per Event', `$${Math.round(analytics.totalRevenue / analytics.totalEvents)}` || '$0', '']
    ];

    this.downloadCSV(csvData, 'analytics');
    toast.success('Analytics exported to CSV successfully!');
  }

  // Export attendee list for an event
  static exportAttendees(eventId: string, eventTitle: string, attendees: any[]): void {
    const csvData = [
      ['Name', 'Email', 'Phone', 'Company', 'Registration Date', 'Status', 'QR Code'],
      ...attendees.map(attendee => [
        attendee.name,
        attendee.email,
        attendee.phone || '',
        attendee.company || '',
        new Date(attendee.registrationDate || attendee.createdAt).toLocaleDateString(),
        attendee.status || 'confirmed',
        attendee.qrCode || attendee.ticketId || ''
      ])
    ];

    this.downloadCSV(csvData, `attendees-${eventTitle.replace(/\s+/g, '-').toLowerCase()}`);
    toast.success(`Attendee list for "${eventTitle}" exported successfully!`);
  }

  // Generic CSV download helper
  private static downloadCSV(data: any[][], filename: string): void {
    const csvContent = data.map(row => 
      row.map(cell => `"${cell?.toString().replace(/"/g, '""') || ''}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}

// CSV Import functionality
export class CSVImportService {
  
  // Import events from CSV
  static async importEvents(file: File): Promise<{ success: boolean; imported: number; errors: string[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const errors: string[] = [];
      let imported = 0;

      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            resolve({ success: false, imported: 0, errors: ['CSV file appears to be empty or invalid'] });
            return;
          }

          const headers = this.parseCSVLine(lines[0]);
          const expectedHeaders = ['title', 'description', 'date', 'venue', 'capacity', 'category'];
          
          // Validate headers
          const hasRequiredHeaders = expectedHeaders.every(header => 
            headers.some(h => h.toLowerCase().includes(header))
          );

          if (!hasRequiredHeaders) {
            errors.push('CSV must contain columns: Title, Description, Date, Venue, Capacity, Category');
          }

          // Process data rows
          for (let i = 1; i < lines.length; i++) {
            try {
              const values = this.parseCSVLine(lines[i]);
              
              if (values.length < expectedHeaders.length) {
                errors.push(`Row ${i + 1}: Insufficient data`);
                continue;
              }

              // Validate and process event data
              const eventData = this.validateEventData(values, headers, i + 1);
              
              if (eventData.errors.length > 0) {
                errors.push(...eventData.errors);
              } else {
                // Here you would typically send to API
                // await api.events.create(eventData.event);
                imported++;
              }

            } catch (error) {
              errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          resolve({ success: errors.length === 0 || imported > 0, imported, errors });
          
        } catch (error) {
          resolve({ 
            success: false, 
            imported: 0, 
            errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`] 
          });
        }
      };

      reader.onerror = () => {
        resolve({ 
          success: false, 
          imported: 0, 
          errors: ['Failed to read file'] 
        });
      };

      reader.readAsText(file);
    });
  }

  // Import registrations from CSV
  static async importRegistrations(file: File): Promise<{ success: boolean; imported: number; errors: string[] }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const errors: string[] = [];
      let imported = 0;

      reader.onload = (e) => {
        try {
          const csv = e.target?.result as string;
          const lines = csv.split('\n').filter(line => line.trim());
          
          if (lines.length < 2) {
            resolve({ success: false, imported: 0, errors: ['CSV file appears to be empty or invalid'] });
            return;
          }

          const headers = this.parseCSVLine(lines[0]);
          const expectedHeaders = ['name', 'email', 'event', 'phone'];
          
          // Process data rows
          for (let i = 1; i < lines.length; i++) {
            try {
              const values = this.parseCSVLine(lines[i]);
              
              // Validate registration data
              const regData = this.validateRegistrationData(values, headers, i + 1);
              
              if (regData.errors.length > 0) {
                errors.push(...regData.errors);
              } else {
                // Here you would typically send to API
                // await api.registrations.create(regData.registration);
                imported++;
              }

            } catch (error) {
              errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }

          resolve({ success: errors.length === 0 || imported > 0, imported, errors });
          
        } catch (error) {
          resolve({ 
            success: false, 
            imported: 0, 
            errors: [`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`] 
          });
        }
      };

      reader.readAsText(file);
    });
  }

  // Helper to parse CSV line with proper quote handling
  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  // Validate event data from CSV
  private static validateEventData(values: string[], headers: string[], row: number): { event: any; errors: string[] } {
    const errors: string[] = [];
    const event: any = {};

    // Map values to event properties
    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      
      switch (header.toLowerCase()) {
        case 'title':
          event.title = value;
          if (!value) errors.push(`Row ${row}: Title is required`);
          break;
        case 'description':
          event.description = value;
          break;
        case 'date':
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            errors.push(`Row ${row}: Invalid date format`);
          } else {
            event.date = date.toISOString();
          }
          break;
        case 'venue':
          event.venue = value;
          if (!value) errors.push(`Row ${row}: Venue is required`);
          break;
        case 'capacity':
          const capacity = parseInt(value);
          if (isNaN(capacity) || capacity <= 0) {
            errors.push(`Row ${row}: Invalid capacity`);
          } else {
            event.capacity = capacity;
          }
          break;
        case 'category':
          event.category = value || 'General';
          break;
      }
    });

    return { event, errors };
  }

  // Validate registration data from CSV
  private static validateRegistrationData(values: string[], headers: string[], row: number): { registration: any; errors: string[] } {
    const errors: string[] = [];
    const registration: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim() || '';
      
      switch (header.toLowerCase()) {
        case 'name':
          registration.name = value;
          if (!value) errors.push(`Row ${row}: Name is required`);
          break;
        case 'email':
          registration.email = value;
          if (!value) {
            errors.push(`Row ${row}: Email is required`);
          } else if (!this.isValidEmail(value)) {
            errors.push(`Row ${row}: Invalid email format`);
          }
          break;
        case 'event':
          registration.eventName = value;
          if (!value) errors.push(`Row ${row}: Event is required`);
          break;
        case 'phone':
          registration.phone = value;
          break;
        case 'company':
          registration.company = value;
          break;
      }
    });

    return { registration, errors };
  }

  // Email validation helper
  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Generate CSV template for events
  static generateEventTemplate(): void {
    const template = [
      ['Title', 'Description', 'Date', 'Venue', 'Capacity', 'Category'],
      ['Sample Event', 'This is a sample event description', '2024-12-31', 'Sample Venue', '100', 'Conference'],
      ['', '', 'YYYY-MM-DD', '', '', 'Workshop|Conference|Seminar|Other']
    ];

    this.downloadTemplate(template, 'event-import-template');
    toast.success('Event import template downloaded!');
  }

  // Generate CSV template for registrations
  static generateRegistrationTemplate(): void {
    const template = [
      ['Name', 'Email', 'Event', 'Phone', 'Company'],
      ['John Doe', 'john@example.com', 'Sample Event', '+1234567890', 'Sample Company'],
      ['', '', '', '', '']
    ];

    this.downloadTemplate(template, 'registration-import-template');
    toast.success('Registration import template downloaded!');
  }

  // Download template helper
  private static downloadTemplate(data: any[][], filename: string): void {
    const csvContent = data.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }
}
