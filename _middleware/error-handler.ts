import { Request, Response, NextFunction } from 'express';

export default function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (typeof err === 'string') {
    return res.status(400).json({ message: err });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  console.error(err);

  return res.status(500).json({
    message: err.message
  });
}