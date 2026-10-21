import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { fetchProperties, fetchPropertyDetail } from './client.js';

test('fetchProperties serializes query parameters and forwards an abort signal', async (context) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify({ total: 0, results: [] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ));
  context.after(() => fetchMock.mock.restore());
  const controller = new AbortController();

  const result = await fetchProperties(
    { city: 'Irvine', limit: 20, offset: 0, empty: '', unset: null },
    { signal: controller.signal },
  );

  assert.deepEqual(result, { total: 0, results: [] });
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/properties?city=Irvine&limit=20&offset=0');
  assert.equal(fetchMock.mock.calls[0].arguments[1].signal, controller.signal);
});

test('fetchPropertyDetail encodes the listing ID and returns the property', async (context) => {
  const property = { L_ListingID: '123' };
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify(property),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  ));
  context.after(() => fetchMock.mock.restore());

  assert.deepEqual(await fetchPropertyDetail('123'), property);
  assert.equal(fetchMock.mock.calls[0].arguments[0], '/api/properties/123');
});

test('throws the API error message for unsuccessful HTTP responses', async (context) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => new Response(
    JSON.stringify({ error: 'Property was not found.' }),
    { status: 404, headers: { 'Content-Type': 'application/json' } },
  ));
  context.after(() => fetchMock.mock.restore());

  await assert.rejects(fetchProperties(), /Property was not found/);
});

test('reports when the listings service cannot be reached', async (context) => {
  const fetchMock = mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('connection refused');
  });
  context.after(() => fetchMock.mock.restore());

  await assert.rejects(fetchProperties(), /Unable to reach the listings service/);
});
