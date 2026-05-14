const rateLimit = require('express-rate-limit');

// General limiter: 100 requests per 15 minutes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Limit: 100 per 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

// Auth limiter: 20 login attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

// AI limiter: 20 AI requests per hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => `user_${req.user?.id || req.user?.userId || 'anon'}`,
  message: { error: 'Too many AI requests. Limit: 20 per hour per user.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false },
});

module.exports = { generalLimiter, authLimiter, aiRateLimiter };
