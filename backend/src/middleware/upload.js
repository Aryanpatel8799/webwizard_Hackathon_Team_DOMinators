import multer from 'multer';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { AppError } from './errorHandler.js';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = uploadsDir;
    
    // Organize uploads by type
    if (file.fieldname === 'csv') {
      uploadPath = path.join(uploadsDir, 'csv');
    } else if (file.fieldname === 'image') {
      uploadPath = path.join(uploadsDir, 'images');
    } else {
      uploadPath = path.join(uploadsDir, 'misc');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext);
    
    const filename = `${basename}-${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Log file upload attempt
  logger.debug(`File upload attempt: ${file.originalname}`, {
    fieldname: file.fieldname,
    mimetype: file.mimetype,
    size: file.size
  });

  // CSV files
  if (file.fieldname === 'csv') {
    if (file.mimetype === 'text/csv' || 
        file.mimetype === 'application/csv' || 
        file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    return cb(new AppError('Only CSV files are allowed', 400), false);
  }

  // Image files
  if (file.fieldname === 'image') {
    if (file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    return cb(new AppError('Only image files are allowed', 400), false);
  }

  // Default: allow common file types
  const allowedTypes = [
    'text/csv',
    'application/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'text/plain'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    return cb(null, true);
  }

  cb(new AppError('File type not allowed', 400), false);
};

// Base multer configuration
const baseUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize, // 5MB default
    files: 5, // Maximum 5 files
    fieldNameSize: 100,
    fieldSize: 1024 * 1024 // 1MB for field values
  }
});

// CSV upload middleware
export const csvUpload = baseUpload.single('csv');

// Image upload middleware
export const imageUpload = baseUpload.single('image');

// Multiple file upload middleware
export const multipleUpload = baseUpload.array('files', 5);

// Custom upload middleware with error handling
export const uploadWithErrorHandler = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        logger.error('File upload error:', err);
        
        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case 'LIMIT_FILE_SIZE':
              return next(new AppError('File size too large', 400));
            case 'LIMIT_FILE_COUNT':
              return next(new AppError('Too many files', 400));
            case 'LIMIT_UNEXPECTED_FILE':
              return next(new AppError('Unexpected file field', 400));
            case 'LIMIT_FIELD_COUNT':
              return next(new AppError('Too many form fields', 400));
            case 'LIMIT_FIELD_KEY':
              return next(new AppError('Field name too long', 400));
            case 'LIMIT_FIELD_VALUE':
              return next(new AppError('Field value too long', 400));
            case 'LIMIT_PART_COUNT':
              return next(new AppError('Too many form parts', 400));
            default:
              return next(new AppError('File upload error', 400));
          }
        }
        
        return next(err);
      }
      
      next();
    });
  };
};

// Memory storage for temporary files
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize
  }
});

// Memory-based CSV upload (for immediate processing)
export const csvMemoryUpload = memoryUpload.single('csv');

// Validate uploaded CSV file
export const validateCSVFile = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('CSV file is required', 400));
  }

  const file = req.file;
  
  // Check file extension
  if (!file.originalname.toLowerCase().endsWith('.csv')) {
    return next(new AppError('File must have .csv extension', 400));
  }

  // Check MIME type
  if (!['text/csv', 'application/csv'].includes(file.mimetype)) {
    return next(new AppError('Invalid CSV file type', 400));
  }

  // Check file size
  if (file.size > config.upload.maxFileSize) {
    return next(new AppError('CSV file too large', 400));
  }

  // Log successful validation
  logger.info('CSV file validated successfully', {
    filename: file.originalname,
    size: file.size,
    mimetype: file.mimetype
  });

  next();
};

// Clean up uploaded files middleware
export const cleanupFiles = (req, res, next) => {
  const originalEnd = res.end;
  
  res.end = function(...args) {
    // Clean up uploaded files if request failed
    if (req.files || req.file) {
      const files = req.files || [req.file];
      
      files.forEach(file => {
        if (file && file.path && fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
            logger.debug(`Cleaned up uploaded file: ${file.path}`);
          } catch (error) {
            logger.error(`Failed to clean up file: ${file.path}`, error);
          }
        }
      });
    }
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// File size formatter
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get file info middleware
export const getFileInfo = (req, res, next) => {
  if (req.file) {
    req.fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      formattedSize: formatFileSize(req.file.size),
      path: req.file.path,
      fieldname: req.file.fieldname
    };
    
    logger.info('File uploaded successfully', req.fileInfo);
  }
  
  next();
};

export default {
  csvUpload,
  imageUpload,
  multipleUpload,
  uploadWithErrorHandler,
  csvMemoryUpload,
  validateCSVFile,
  cleanupFiles,
  formatFileSize,
  getFileInfo
};
