import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

import db from '../_helpers/db';

dotenv.config();

interface JwtPayload {
  id: number;
  sub: number;
}

function authorize(roles: string | string[] = []) {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return async (req: Request | any, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

        if (typeof decoded === 'string' || !('id' in decoded)) {
          return res.status(401).json({ message: 'Unauthorized' });
        }

        req.user = await db.Account.findByPk(decoded.id);

      if (!req.user || (roles.length && !roles.includes(req.user.role))) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      next();
    } catch {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  };
}

export default authorize;