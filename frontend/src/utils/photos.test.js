import assert from 'node:assert/strict';
import test from 'node:test';
import { getFirstPhoto, getPhotos } from './photos.js';

test('returns all valid URLs from the L_Photos JSON array', () => {
  assert.deepEqual(
    getPhotos('["https://images.example/home.jpg","bad-url","https://images.example/second.jpg"]'),
    ['https://images.example/home.jpg', 'https://images.example/second.jpg'],
  );
});

test('returns first URL from a JSON string array', () => {
  assert.equal(
    getFirstPhoto('["https://images.example/home.jpg","https://images.example/second.jpg"]'),
    'https://images.example/home.jpg',
  );
});

test('returns first URL from a parsed array', () => {
  assert.equal(getFirstPhoto(['https://images.example/home.jpg']), 'https://images.example/home.jpg');
});

test('handles null, empty, malformed, and non-array photo data', () => {
  for (const value of [null, undefined, '', 'not-json', '{}', 'null', '[]', []]) {
    assert.equal(getFirstPhoto(value), null);
    assert.deepEqual(getPhotos(value), []);
  }
});

test('ignores unusable photo values and unsafe URL protocols', () => {
  assert.equal(getFirstPhoto(['', null, 'javascript:alert(1)', 'https://images.example/home.jpg']), 'https://images.example/home.jpg');
  assert.equal(getFirstPhoto(['javascript:alert(1)']), null);
});
