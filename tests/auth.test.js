const request = require('supertest');
const bcrypt = require('bcrypt');

// Mock the database module before requiring the app
jest.mock('../src/db', () => ({
  query: jest.fn()
}));

const db = require('../src/db');
let app;

beforeAll(async () => {
  const hash = await bcrypt.hash('1234', 10);
  db.query.mockImplementation((text, params) => {
    if (text.includes('SELECT id, vorname, pin_hash FROM users')) {
      return Promise.resolve({ rows: [{ id: 1, vorname: 'Emily', pin_hash: hash }] });
    }
    return Promise.resolve({ rows: [] });
  });
  app = require('../src/index');
});

describe('Authentication', () => {
  test('POST /login with valid credentials redirects and sets session cookie', async () => {
    const res = await request(app)
      .post('/login')
      .type('form')
      .send({ vorname: 'Emily', pin: '1234' });

    expect(res.status).toBe(302);
    expect(res.headers['location']).toBe('/balance');
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some(c => c.startsWith('connect.sid='))).toBe(true);
  });
});
