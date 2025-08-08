/**
 * XSS Protection Utility
 * Sanitizes user inputs to prevent cross-site scripting attacks
 */
import createDOMPurify from 'dompurify.js';
import { JSDOM } from 'jsdom.js';

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

export const sanitizeHtml = (input: string): string => {
  return DOMPurify.sanitize(input);
};

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};