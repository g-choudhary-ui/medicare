const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../server');

describe('Security & Authentication Controls', () => {
  test('Passcode hashing with bcrypt works correctly with salt rounds', async () => {
    const rawPasscode = '123456';
    const hash = await bcrypt.hash(rawPasscode, 10);

    // Hash should not be equal to plain text
    assert.notEqual(hash, rawPasscode);
    assert.ok(hash.startsWith('$2'));

    // Comparison should succeed for correct passcode
    const match = await bcrypt.compare(rawPasscode, hash);
    assert.equal(match, true);

    // Comparison should fail for incorrect passcode
    const wrongMatch = await bcrypt.compare('wrongcode', hash);
    assert.equal(wrongMatch, false);
  });

  test('Protected endpoint rejects request missing authentication headers (401)', async () => {
    const res = await request(app).get('/api/medications');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(res.body.error);
  });

  test('Protected endpoint rejects request with invalid profile/passcode headers', async () => {
    const res = await request(app)
      .get('/api/medications')
      .set('x-profile-id', 'non-existent-profile')
      .set('x-passcode', 'wrong-passcode');

    // Either 401 or 404 depending on existence
    assert.ok(res.status === 401 || res.status === 404);
    assert.equal(res.body.success, false);
  });
});
