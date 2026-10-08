const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const test = require('node:test');
const { createPropertiesRouter, parseQuery } = require('../routes/properties');

async function withServer(database, run) {
  const app = express();
  app.use('/api/properties', createPropertiesRouter(database));
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address();
    await run(`http://127.0.0.1:${port}/api/properties`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve({ status: response.statusCode, body: JSON.parse(body) });
      });
    }).on('error', reject);
  });
}

test('combining minPrice and beds applies both bindings to count and results', async () => {
  const calls = [];
  const database = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return sql.startsWith('SELECT COUNT')
        ? [[{ total: 2 }], []]
        : [[{ id: 1 }, { id: 2 }], []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}?minPrice=300000&beds=3`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body, {
      total: 2,
      limit: 20,
      offset: 0,
      results: [{ id: 1 }, { id: 2 }],
    });
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /L_SystemPrice >= \? AND L_Keyword2 = \?/);
  assert.deepEqual(calls[0].values, [300000, 3]);
  assert.match(calls[1].sql, /L_SystemPrice >= \? AND L_Keyword2 = \?/);
  assert.deepEqual(calls[1].values, [300000, 3, 20, 0]);
});

test('city search uses the declared L_City column and normalizes case and spaces', async () => {
  const calls = [];
  const database = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return sql.startsWith('SELECT COUNT')
        ? [[{ total: 1 }], []]
        : [[{ id: 1 }], []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}?city=%20Irvine%20`);

    assert.equal(response.status, 200);
    assert.equal(response.body.total, 1);
    assert.deepEqual(response.body.results, [{ id: 1 }]);
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /LOWER\(TRIM\(L_City\)\) = LOWER\(TRIM\(\?\)\)/);
  assert.doesNotMatch(calls[0].sql, /L_City_Normalized/);
  assert.deepEqual(calls[0].values, ['Irvine']);
  assert.deepEqual(calls[1].values, ['Irvine', 20, 0]);
});

test('rejects invalid query values with a descriptive 400 response', async () => {
  assert.throws(() => parseQuery({ minPrice: 'abc' }), /minPrice must be a number/);
  assert.throws(() => parseQuery({ limit: '0' }), /limit must be between 1 and 100/);
  assert.throws(() => parseQuery({ limit: '200' }), /limit must be between 1 and 100/);
  assert.throws(() => parseQuery({ minPrice: '400', maxPrice: '300' }), /minPrice cannot be greater/);

  await withServer({ execute: async () => { throw new Error('database should not be called'); } }, async (url) => {
    const response = await getJson(`${url}?minPrice=abc`);
    assert.equal(response.status, 400);
    assert.match(response.body.error, /minPrice must be a number/);
  });
});

test('supports pagination parameters and a default page size', () => {
  assert.deepEqual(parseQuery({}).limit, 20);
  assert.deepEqual(parseQuery({ limit: '10', offset: '20' }), {
    filters: {},
    limit: 10,
    offset: 20,
  });
});
