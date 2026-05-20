import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

import db from '../_helpers/db';
import sendEmail from '../_helpers/send-email';

dotenv.config();

interface AuthenticateParams {
  email: string;
  password: string;
  ipAddress: string;
}

interface TokenParams {
  token: string;
  ipAddress: string;
}

interface RegisterParams {
  email: string;
  password: string;
  title?: string;
  firstName: string;
  lastName: string;
  acceptTerms?: boolean;
  role?: string;
}

interface VerifyEmailParams {
  token: string;
}

interface ForgotPasswordParams {
  email: string;
}

interface ResetTokenParams {
  token: string;
}

interface ResetPasswordParams {
  token: string;
  password: string;
}

async function authenticate({ email, password, ipAddress }: AuthenticateParams) {
  const account = await db.Account.findOne({ where: { email } });

  if (
    !account ||
    !account.verified ||
    !bcrypt.compareSync(password, account.passwordHash)
  ) {
    throw 'Email or password is incorrect';
  }

  const jwtToken = generateJwtToken(account);
  const refreshToken = await generateRefreshToken(account, ipAddress);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: refreshToken.token
  };
}

async function refreshToken({ token, ipAddress }: TokenParams) {
  const refreshToken = await getRefreshToken(token);
  const account = await refreshToken.getAccount();

  const newRefreshToken = await generateRefreshToken(account, ipAddress);

  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;
  refreshToken.replacedByToken = newRefreshToken.token;

  await refreshToken.save();

  const jwtToken = generateJwtToken(account);

  return {
    ...basicDetails(account),
    jwtToken,
    refreshToken: newRefreshToken.token
  };
}

async function revokeToken({ token, ipAddress }: TokenParams) {
  const refreshToken = await getRefreshToken(token);

  refreshToken.revoked = Date.now();
  refreshToken.revokedByIp = ipAddress;

  await refreshToken.save();
}

async function register(params: RegisterParams, origin: string) {
  console.log('Register origin:', origin);

  if (await db.Account.findOne({ where: { email: params.email } })) {
    throw `Email "${params.email}" is already registered`;
  }

  const account = new db.Account(params);

  const isFirstAccount = (await db.Account.count()) === 0;

  account.role = isFirstAccount ? 'Admin' : 'User';
  account.verificationToken = randomTokenString();
  account.passwordHash = bcrypt.hashSync(params.password, 10);

  await account.save();
  await sendVerificationEmail(account, origin);
}

async function verifyEmail({ token }: VerifyEmailParams) {
  const account = await db.Account.findOne({
    where: { verificationToken: token }
  });

  if (!account) {
    throw 'Verification failed';
  }

  account.verified = Date.now();
  account.verificationToken = null;

  await account.save();
}

async function forgotPassword({ email }: ForgotPasswordParams, origin: string) {
  const account = await db.Account.findOne({ where: { email } });

  if (!account) {
    return;
  }

  account.resetToken = randomTokenString();
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await account.save();
  await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }: ResetTokenParams) {
  const account = await db.Account.findOne({
    where: { resetToken: token }
  });

  if (!account || account.resetTokenExpires < Date.now()) {
    throw 'Invalid token';
  }
}

async function resetPassword({ token, password }: ResetPasswordParams) {
  const account = await db.Account.findOne({
    where: { resetToken: token }
  });

  if (!account || account.resetTokenExpires < Date.now()) {
    throw 'Invalid token';
  }

  account.passwordHash = bcrypt.hashSync(password, 10);
  account.passwordReset = Date.now();
  account.resetToken = null;
  account.resetTokenExpires = null;

  await account.save();
}

async function getAll() {
  const accounts = await db.Account.findAll();

  return accounts.map((account: any) => basicDetails(account));
}

async function getById(id: string | number) {
  const account = await getAccount(id);

  return basicDetails(account);
}

async function create(params: any) {
  if (await db.Account.findOne({ where: { email: params.email } })) {
    throw `Email "${params.email}" is already registered`;
  }

  const account = new db.Account(params);

  account.passwordHash = bcrypt.hashSync(params.password, 10);
  account.verified = Date.now();

  await account.save();

  return basicDetails(account);
}

async function update(id: string | number, params: any) {
  const account = await getAccount(id);

  if (params.password) {
    params.passwordHash = bcrypt.hashSync(params.password, 10);
  }

  params.updated = Date.now();

  Object.assign(account, params);

  await account.save();

  return basicDetails(account);
}

async function _delete(id: string | number) {
  const account = await getAccount(id);

  await account.destroy();
}

// Helpers
async function getAccount(id: string | number) {
  const account = await db.Account.findByPk(id);

  if (!account) {
    throw 'Account not found';
  }

  return account;
}

async function getRefreshToken(token: string) {
  const refreshToken = await db.RefreshToken.findOne({
    where: { token }
  });

  if (!refreshToken || !isActive(refreshToken)) {
    throw 'Invalid token';
  }

  return refreshToken;
}

function isActive(token: any) {
  return !token.revoked && new Date() < new Date(token.expires);
}

function generateJwtToken(account: any) {
  return jwt.sign(
    {
      sub: account.id,
      id: account.id
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: '15m'
    }
  );
}

async function generateRefreshToken(account: any, ipAddress: string) {
  const token = await db.RefreshToken.create({
    AccountId: account.id,
    token: randomTokenString(),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdByIp: ipAddress
  });

  return token;
}

function randomTokenString() {
  return crypto.randomBytes(40).toString('hex');
}

function basicDetails(account: any) {
  const {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    created,
    updated,
    verified
  } = account;

  return {
    id,
    title,
    firstName,
    lastName,
    email,
    role,
    created,
    updated,
    isVerified: !!verified
  };
}

async function sendVerificationEmail(account: any, origin: string) {
  const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;

  console.log('Sending verification email to:', account.email);
  console.log('Verify URL:', verifyUrl);

  await sendEmail({
    to: account.email,
    subject: 'Sign-up Verification API - Verify Email',
    html: `
      <p>Please click the link below to verify your email:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
    `
  });
}

async function sendPasswordResetEmail(account: any, origin: string) {
  const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;

  await sendEmail({
    to: account.email,
    subject: 'Sign-up Verification API - Reset Password',
    html: `
      <p>Please click the link below to reset your password:</p>
      <a href="${resetUrl}">${resetUrl}</a>
    `
  });
}

export default {
  authenticate,
  refreshToken,
  revokeToken,
  register,
  verifyEmail,
  forgotPassword,
  validateResetToken,
  resetPassword,
  getAll,
  getById,
  create,
  update,
  delete: _delete
};