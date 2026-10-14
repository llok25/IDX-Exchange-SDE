function requestLogger(log = console.log) {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const startedAt = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      log(`${timestamp} ${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(2)}ms`);
    });

    next();
  };
}

module.exports = requestLogger;
