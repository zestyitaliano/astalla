import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { prisma } from '../services/prisma.js';

export const authRouter = Router();

authRouter.post('/basic-login', async (req, res) => {
  try {
    const { emailOrUsername, identifier, password } = req.body ?? {};

    const rawIdentifier =
      typeof emailOrUsername === 'string' && emailOrUsername.trim().length > 0
        ? emailOrUsername.trim().toLowerCase()
        : typeof identifier === 'string' && identifier.trim().length > 0
        ? identifier.trim().toLowerCase()
        : '';

    if (!rawIdentifier || typeof password !== 'string' || password.trim() === '') {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: rawIdentifier }, { username: rawIdentifier }]
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // For now this can just be a static string. The frontend only needs
    // *some* non-empty access_token value.
    const accessToken = 'astalla-basic-token';

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name ?? 'User',
        role: user.role ?? 'ORG_ADMIN'
      },
      access_token: accessToken
    });
  } catch (error) {
    console.error('[auth/basic-login] error', error);
    return res.status(500).json({ message: 'Internal error' });
  }
});
