const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const test = require('node:test');
const { createPropertiesRouter, parseQuery } = require('../routes/properties');

async function withServer(database, run, middleware) {
  const app = express();
  if (middleware) app.use(middleware);
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

test('returns the full property for a listing ID', async () => {
  const property = { id: 9, L_ListingID: '1190952876', L_Address: '123 Main St' };
  let call;
  const database = {
    async execute(sql, values) {
      call = { sql, values };
      return [[property], []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}/1190952876`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, property);
  });

  assert.match(call.sql, /FROM rets_property WHERE L_ListingID = \?/);
  assert.deepEqual(call.values, ['1190952876']);
});

test('returns a helpful 404 when a listing ID has no property', async () => {
  await withServer({ execute: async () => [[], []] }, async (url) => {
    const response = await getJson(`${url}/1190952876`);
    assert.equal(response.status, 404);
    assert.match(response.body.error, /1190952876.*not found/i);
  });
});

test('rejects malformed and oversized listing IDs without querying', async () => {
  const database = {
    async execute() {
      assert.fail('Invalid listing ID should not query the database');
    },
  };

  await withServer(database, async (url) => {
    for (const id of ['not-a-listing', '1'.repeat(256)]) {
      const response = await getJson(`${url}/${id}`);
      assert.equal(response.status, 400);
      assert.match(response.body.error, /numeric listing ID/);
    }
    for (const id of ['not-a-listing', '1'.repeat(256)]) {
      const response = await getJson(`${url}/${id}/openhouses`);
      assert.equal(response.status, 400);
      assert.match(response.body.error, /numeric listing ID/);
    }
  });
});

test('returns ordered open houses after confirming the property exists', async () => {
  const events = [
    { OpenHouseDate: '2026-09-19', OH_StartTime: '10:00:00', all_data: '{"event":1}' },
    { OpenHouseDate: '2026-09-19', OH_StartTime: '12:00:00', all_data: '{"event":2}' },
  ];
  const calls = [];
  const database = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return sql.includes('rets_property') ? [[{ L_ListingID: values[0] }], []] : [events, []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}/1190952876/openhouses`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, events);
  });

  assert.match(calls[0].sql, /FROM rets_property WHERE L_ListingID = \?/);
  assert.match(calls[1].sql, /FROM rets_openhouse WHERE L_ListingID = \? ORDER BY OpenHouseDate, OH_StartTime/);
  assert.deepEqual(calls.map((call) => call.values), [['1190952876'], ['1190952876']]);
});

test('returns an empty array for a property with no open houses', async () => {
  const database = {
    async execute(sql) {
      return sql.includes('rets_property') ? [[{ L_ListingID: '123' }], []] : [[], []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}/123/openhouses`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, []);
  });
});

test('returns 404 when neither the property nor open houses exist', async () => {
  const database = {
    async execute() {
      return [[], []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}/1190952876/openhouses`);
    assert.equal(response.status, 404);
    assert.match(response.body.error, /1190952876.*not found/i);
  });
});

test('returns open houses for a listing that is absent from the property table', async () => {
  const event = { L_ListingID: '1190952876', OpenHouseDate: '2026-09-27' };
  const calls = [];
  const database = {
    async execute(sql, values) {
      calls.push({ sql, values });
      return sql.includes('rets_property') ? [[], []] : [[event], []];
    },
  };

  await withServer(database, async (url) => {
    const response = await getJson(`${url}/1190952876/openhouses`);
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [event]);
  });

  assert.equal(calls.length, 2);
  assert.match(calls[0].sql, /FROM rets_property WHERE L_ListingID = \?/);
  assert.match(calls[1].sql, /FROM rets_openhouse WHERE L_ListingID = \? ORDER BY OpenHouseDate, OH_StartTime/);
  assert.deepEqual(calls.map((call) => call.values), [['1190952876'], ['1190952876']]);
});

test('converts property and open-house database failures to 500 responses', async () => {
  const database = {
    async execute() {
      throw new Error('database unavailable');
    },
  };

  await withServer(database, async (url) => {
    const property = await getJson(`${url}/123`);
    assert.equal(property.status, 500);
    assert.match(property.body.error, /Failed to retrieve property/);

    const openhouses = await getJson(`${url}/123/openhouses`);
    assert.equal(openhouses.status, 500);
    assert.match(openhouses.body.error, /Failed to retrieve open houses/);
  });
});

test('registers the openhouses route before the dynamic property route', () => {
  const router = createPropertiesRouter({ execute: async () => [[], []] });
  const paths = router.stack
    .filter((layer) => layer.route)
    .map((layer) => layer.route.path);

  assert.ok(paths.indexOf('/:id/openhouses') < paths.indexOf('/:id'));
});
