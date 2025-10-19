import assert from 'node:assert/strict';
import { after, afterEach, before, describe, it } from 'node:test';
import type { AddressInfo } from 'node:net';
import type { Server } from 'http';
import bcrypt from 'bcryptjs';

import { createApp } from '../index.js';
import { prisma } from '../services/prisma.js';

type FindFirst = typeof prisma.user.findFirst;
type FindFirstArgs = Parameters<FindFirst>[0];

const originalFindFirst = prisma.user.findFirst.bind(prisma.user) as FindFirst;

const setFindFirst = (impl: FindFirst) => {
  (prisma.user as unknown as { findFirst: FindFirst }).findFirst = impl;
};

const resetFindFirst = () => {
  setFindFirst(originalFindFirst);
};

describe('POST /auth/basic-login', () => {
  let server: Server | undefined;
  let baseUrl: string;

  before(() => {
    const app = createApp();
    server = app.listen(0);
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  after(async () => {
    resetFindFirst();
    if (server) {
      await new Promise<void>((resolve, reject) => {
        server?.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
    await prisma.$disconnect();
  });

  afterEach(() => {
    resetFindFirst();
  });

  it('returns 400 when credentials are missing', async () => {
    const response = await fetch(`${baseUrl}/auth/basic-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.message, 'Missing credentials');
  });

  it('returns 401 for invalid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    setFindFirst(async (_args: FindFirstArgs) => ({
      id: 'user-1',
      email: 'user@example.com',
      username: 'user',
      passwordHash,
      name: 'Test User',
      role: 'user',
    }) as any);

    const response = await fetch(`${baseUrl}/auth/basic-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'user@example.com', password: 'wrong-password' }),
    });

    assert.equal(response.status, 401);
    const payload = await response.json();
    assert.equal(payload.message, 'Invalid credentials');
  });

  it('returns 200 and user info for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    setFindFirst(async (args: FindFirstArgs) => {
      assert.deepEqual(args?.where, {
        OR: [
          { email: 'user@example.com' },
          { username: 'user@example.com' },
        ],
      });
      return {
        id: 'user-1',
        email: 'user@example.com',
        username: 'user',
        passwordHash,
        name: 'Test User',
        role: 'admin',
      } as any;
    });

    const response = await fetch(`${baseUrl}/auth/basic-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername: 'user@example.com', password: 'correct-password' }),
    });

    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.deepEqual(payload, {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Test User',
      role: 'admin',
    });
  });
});
