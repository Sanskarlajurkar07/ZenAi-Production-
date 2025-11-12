// src/middleware/rateLimiter.middleware.js
const rateLimit = require('express-rate-limit');

// Use in-memory store (works without Redis for development)
// For production, you can add Redis store later

// API Rate Limiter
exports.apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Auth Rate Limiter (stricter)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes'
  },
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false
});

// AI Endpoints Rate Limiter
exports.aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 AI requests per minute
  message: {
    success: false,
    message: 'AI request limit exceeded, please slow down'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Alternative: In-Memory Store (if Redis fails)
// Uncomment this if you want to use in-memory store as fallback
/*
const MemoryStore = require('express-rate-limit').MemoryStore;

exports.apiLimiter = rateLimit({
  store: new MemoryStore(),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

exports.authLimiter = rateLimit({
  store: new MemoryStore(),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many login attempts'
  },
  skipSuccessfulRequests: true
});

exports.aiLimiter = rateLimit({
  store: new MemoryStore(),
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'AI request limit exceeded'
  }
});
*/