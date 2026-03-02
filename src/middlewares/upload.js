/**
 * File Upload Middleware
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const ApiError = require('../utils/ApiError');

// Ensure upload directory exists
const uploadsDir = path.join(process.cwd(), config.upload.storageDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedMimes = config.upload.allowedMimeTypes;
  const allowedExts = config.upload.allowedExtensions;
  
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();
  
  if (allowedMimes.includes(mime) && allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new ApiError(400, 'Only image files (jpg, jpeg, png, gif, webp) are allowed.'), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
  },
});

// Export single and multiple upload middleware
const uploadSingle = upload.single('image');
const uploadMultiple = upload.array('images', 10);

// Middleware wrapper to handle multer errors
const handleUpload = (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File too large. Maximum size is 5 MB.'));
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return next(ApiError.badRequest('Unexpected file field.'));
      }
      return next(err);
    }
    next();
  });
};

const handleMultipleUpload = (req, res, next) => {
  uploadMultiple(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(ApiError.badRequest('File too large. Maximum size is 5 MB.'));
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return next(ApiError.badRequest('Too many files. Maximum is 10.'));
      }
      return next(err);
    }
    next();
  });
};

module.exports = {
  upload,
  uploadSingle,
  uploadMultiple,
  handleUpload,
  handleMultipleUpload,
  uploadsDir,
};
