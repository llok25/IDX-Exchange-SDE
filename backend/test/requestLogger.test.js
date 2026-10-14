const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const test = require('node:test');
const requestLogger = require('../middleware/requestLogger');

test('logs each completed request with timestamp, method, URL, status, and duration', async () => {
  const lines = [];
  const app = express();
  app.use(requestLogger((line) => lines.push(line)));
  app.get('/test', (req, res) => res.status(201).json({ ok: true }));
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/test?query=1`, (response) => {
        response.resume();
        response.on('end', resolve);
      }).on('error', reject);
    });

    assert.equal(lines.length, 1);
    assert.match(lines[0], /^\d{4}-\d\d-\d\dT\S+ GET \/test\?query=1 201 \d+\.\d{2}ms$/);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
