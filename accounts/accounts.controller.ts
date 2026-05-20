import express, { Request, Response, NextFunction } from 'express';

import accountService from './accounts.service';
import authorize from '../_middleware/authorize';

const router = express.Router();

router.post('/authenticate', authenticate);
router.post('/refresh-token', refreshToken);
router.post('/revoke-token', authorize(), revokeToken);
router.post('/register', register);
router.post('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/validate-reset-token', validateResetToken);
router.post('/reset-password', resetPassword);

router.get('/', authorize('Admin'), getAll);
router.get('/:id', authorize(), getById);
router.post('/', authorize('Admin'), create);
router.put('/:id', authorize(), update);
router.delete('/:id', authorize(), _delete);

function authenticate(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;
  const ipAddress = req.ip || '';

  accountService
    .authenticate({ email, password, ipAddress })
    .then(({ refreshToken, ...account }: any) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function refreshToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies.refreshToken;
  const ipAddress = req.ip || '';

  if (!token) {
    res.status(401).json({ message: 'No refresh token found' });
    return;
  }

  accountService
    .refreshToken({ token, ipAddress })
    .then(({ refreshToken, ...account }: any) => {
      setTokenCookie(res, refreshToken);
      res.json(account);
    })
    .catch(next);
}

function revokeToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies.refreshToken || req.body.token;
  const ipAddress = req.ip || '';

  if (!token) {
    res.status(400).json({ message: 'Token is required' });
    return;
  }

  accountService
    .revokeToken({ token, ipAddress })
    .then(() => res.json({ message: 'Token revoked' }))
    .catch(next);
}

function register(req: Request, res: Response, next: NextFunction): void {
  const origin =
    process.env.FRONTEND_URL ||
    req.get('origin') ||
    'http://localhost:4200';

  accountService
    .register(req.body, origin)
    .then(() =>
      res.json({
        message:
          'Registration successful, please check your email for verification instructions'
      })
    )
    .catch(next);
}

function verifyEmail(req: Request, res: Response, next: NextFunction): void {
  accountService
    .verifyEmail(req.body)
    .then(() =>
      res.json({
        message: 'Verification successful, you can now login'
      })
    )
    .catch(next);
}

function forgotPassword(req: Request, res: Response, next: NextFunction): void {
  const origin =
    process.env.FRONTEND_URL ||
    req.get('origin') ||
    'http://localhost:4200';

  accountService
    .forgotPassword(req.body, origin)
    .then(() =>
      res.json({
        message: 'Please check your email for password reset instructions'
      })
    )
    .catch(next);
}

function validateResetToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  accountService
    .validateResetToken(req.body)
    .then(() =>
      res.json({
        message: 'Token is valid'
      })
    )
    .catch(next);
}

function resetPassword(req: Request, res: Response, next: NextFunction): void {
  accountService
    .resetPassword(req.body)
    .then(() =>
      res.json({
        message: 'Password reset successful, you can now login'
      })
    )
    .catch(next);
}

function getAll(req: Request, res: Response, next: NextFunction): void {
  accountService
    .getAll()
    .then((accounts: any) => res.json(accounts))
    .catch(next);
}

function getById(req: Request, res: Response, next: NextFunction): void {
  accountService
    .getById(String(req.params.id))
    .then((account: any) => res.json(account))
    .catch(next);
}

function create(req: Request, res: Response, next: NextFunction): void {
  accountService
    .create(req.body)
    .then((account: any) => res.json(account))
    .catch(next);
}

function update(req: Request, res: Response, next: NextFunction): void {
  accountService
    .update(String(req.params.id), req.body)
    .then((account: any) => res.json(account))
    .catch(next);
}

function _delete(req: Request, res: Response, next: NextFunction): void {
  accountService
    .delete(String(req.params.id))
    .then(() =>
      res.json({
        message: 'Account deleted successfully'
      })
    )
    .catch(next);
}

function setTokenCookie(res: Response, token: string): void {
  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('refreshToken', token, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sameSite: isProduction ? 'none' : 'lax',
    secure: isProduction
  });
}

export default router;