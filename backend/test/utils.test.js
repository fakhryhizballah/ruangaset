import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegex, HttpError, pageOptions } from '../src/utils/http.js';

test('escapeRegex treats search text as literal', () => {
  const text = 'RA-[1].*';
  const escaped = escapeRegex(text);
  assert.equal(new RegExp(escaped).test(text), true);
  assert.equal(new RegExp(escaped).test('RA-111'), false);
});

test('pageOptions normalizes and caps pagination input', () => {
  assert.deepEqual(pageOptions({ page: '0', limit: '999' }), { page: 1, limit: 200, skip: 0 });
  assert.deepEqual(pageOptions({ page: '3', limit: '20' }), { page: 3, limit: 20, skip: 40 });
});

test('HttpError carries an HTTP status', () => {
  const error = new HttpError(409, 'Konflik');
  assert.equal(error.status, 409);
  assert.equal(error.message, 'Konflik');
});
