import { Router } from 'express';
import bcrypt from 'bcryptjs';

import { prisma } from '../services/prisma.js';

export const authRouter = Router();

authRouter.post('/basic-login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body ?? {};
    if (!emailOrUsername || !password) {
      return res.status(400).json({ message: 'Missing credentials' });
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrUsername.toLowerCase() },
          { username: emailOrUsername },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name ?? 'User',
      role: user.role ?? 'user',
    });
  } catch (error) {
    console.error('[auth/basic-login] error', error);
    return res.status(500).json({ message: 'Internal error' });
  }
});
