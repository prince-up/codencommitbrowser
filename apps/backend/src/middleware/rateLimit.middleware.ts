import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the \`RateLimit-*\` headers
  legacyHeaders: false, // Disable the \`X-RateLimit-*\` headers
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed login/register attempts per hour to prevent brute force
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' }
});
