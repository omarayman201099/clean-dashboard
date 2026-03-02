/**
 * Winston Logger Configuration
 * Centralized logging with file rotation
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Default configuration
const defaultLogDir = process.env.LOG_DIR || 'logs';
const defaultLogLevel = process.env.LOG_LEVEL || 'info';

// Ensure log directory exists
if (!fs.existsSync(defaultLogDir)) {
  fs.mkdirSync(defaultLogDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
  })
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `${timestamp} ${level}: ${message}`;
  })
);

// Create basic transports array
const transports = [
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports with simple file rotation
// Using basic File transport for compatibility
try {
  transports.push(
    new winston.transports.File({
      filename: path.join(defaultLogDir, 'error.log'),
      level: 'error',
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 30,
    }),
    new winston.transports.File({
      filename: path.join(defaultLogDir, 'combined.log'),
      maxsize: 20 * 1024 * 1024, // 20MB
      maxFiles: 30,
    })
  );
} catch (err) {
  console.error('Failed to create file transports:', err);
}

// Create Winston logger
const logger = winston.createLogger({
  level: defaultLogLevel,
  format: logFormat,
  transports: transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(defaultLogDir, 'exception.log'),
      maxsize: 20 * 1024 * 1024,
      maxFiles: 30,
    }),
  ],
});

module.exports = logger;
