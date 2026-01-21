// Simple in-memory rate limiter (per IP + route)
// Not suitable for multi-instance deployments without shared storage.

const buckets = new Map();

export const rateLimit =
  ({ windowMs = 60_000, max = 60 } = {}) =>
  (req, res, next) => {
    try {
      const key = `${req.ip}:${req.baseUrl || ''}${req.path}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      const timestamps = buckets.get(key) || [];
      // prune old
      const fresh = timestamps.filter((ts) => ts > windowStart);
      fresh.push(now);
      buckets.set(key, fresh);

      if (fresh.length > max) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests. Please slow down.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil(windowMs / 1000),
          timestamp: new Date().toISOString()
        });
      }

      return next();
    } catch (err) {
      // On limiter failure, do not block the request
      return next();
    }
  };




