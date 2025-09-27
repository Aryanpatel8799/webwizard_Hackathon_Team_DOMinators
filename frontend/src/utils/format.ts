import { format, parseISO, formatDistanceToNow, isAfter, isBefore } from 'date-fns';

/**
 * Format date for display in event cards
 */
export function formatEventDate(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, 'MMM dd, yyyy • h:mm a');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date for form inputs (ISO string to date input format)
 */
export function formatDateForInput(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return format(date, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

/**
 * Get relative time string (e.g., "in 2 hours", "3 days ago")
 */
export function getRelativeTime(dateString: string): string {
  try {
    const date = parseISO(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

/**
 * Check if an event is upcoming, live, or ended
 */
export function getEventStatus(eventDate: string, registrationDeadline?: string): 'upcoming' | 'live' | 'ended' {
  try {
    const now = new Date();
    const eventDateTime = parseISO(eventDate);
    const deadline = registrationDeadline ? parseISO(registrationDeadline) : eventDateTime;
    
    if (isAfter(now, eventDateTime)) {
      return 'ended';
    }
    
    if (isAfter(now, deadline)) {
      return 'live';
    }
    
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Format number with commas (e.g., 1,234)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * Generate initials from name
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (basic validation)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}
