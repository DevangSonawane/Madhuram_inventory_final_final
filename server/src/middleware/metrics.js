// Simple in-memory metrics collector (per-process, non-distributed).
// Tracks request counts, error counts, duration buckets per route key.

const metricsStore = {
  totals: { requests: 0, errors: 0 },
  routes: {}, // key -> { count, errorCount, totalDurationMs, statuses: {code: count} }
  lastUpdated: null,
};

const cleanPath = (originalUrl = '') => {
  // Strip query string to avoid unbounded cardinality
  return originalUrl.split('?')[0] || originalUrl;
};

export const metricsCollector = (label = 'api') => (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const path = cleanPath(req.originalUrl);
    const key = `${req.method} ${path}`;

    const bucket =
      metricsStore.routes[key] ||
      { count: 0, errorCount: 0, totalDurationMs: 0, statuses: {} };

    bucket.count += 1;
    bucket.totalDurationMs += duration;
    bucket.statuses[res.statusCode] = (bucket.statuses[res.statusCode] || 0) + 1;

    metricsStore.routes[key] = bucket;

    metricsStore.totals.requests += 1;
    if (res.statusCode >= 400) {
      bucket.errorCount += 1;
      metricsStore.totals.errors += 1;
    }

    metricsStore.lastUpdated = new Date().toISOString();
  });

  next();
};

export const getMetricsSnapshot = () => {
  return {
    ...metricsStore,
    // Provide basic per-route latency averages
    routes: Object.fromEntries(
      Object.entries(metricsStore.routes).map(([key, value]) => {
        const avg = value.count ? value.totalDurationMs / value.count : 0;
        return [
          key,
          {
            ...value,
            avgDurationMs: Number(avg.toFixed(2)),
          },
        ];
      })
    ),
  };
};


