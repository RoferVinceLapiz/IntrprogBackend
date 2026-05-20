const db = require('../_helpers/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../_helpers/send-email');
require('dotenv').config();

async function authenticate({ email, password, ipAddress }) {
    const account = await db.Account.findOne({ where: { email } });
    if (!account || !account.verified || !bcrypt.compareSync(password, account.passwordHash))
        throw 'Email or password is incorrect';

    const jwtToken = generateJwtToken(account);
    const refreshToken = await generateRefreshToken(account, ipAddress);

    return { ...basicDetails(account), jwtToken, refreshToken: refreshToken.token };
}

async function refreshToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    const account = await refreshToken.getAccount();

    const newRefreshToken = await generateRefreshToken(account, ipAddress);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    refreshToken.replacedByToken = newRefreshToken.token;
    await refreshToken.save();

    const jwtToken = generateJwtToken(account);
    return { ...basicDetails(account), jwtToken, refreshToken: newRefreshToken.token };
}

async function revokeToken({ token, ipAddress }) {
    const refreshToken = await getRefreshToken(token);
    refreshToken.revoked = Date.now();
    refreshToken.revokedByIp = ipAddress;
    await refreshToken.save();
}

async function register(params, origin) {
    console.log('Register origin:', origin);  // add this
    if (await db.Account.findOne({ where: { email: params.email } }))
        throw `Email "${params.email}" is already registered`;

    const account = new db.Account(params);
    const isFirstAccount = (await db.Account.count()) === 0;
    account.role = isFirstAccount ? 'Admin' : 'User';
    account.verificationToken = randomTokenString();
    account.passwordHash = bcrypt.hashSync(params.password, 10);

    await account.save();
    await sendVerificationEmail(account, origin);
}

async function verifyEmail({ token }) {
    const account = await db.Account.findOne({ where: { verificationToken: token } });
    if (!account) throw 'Verification failed';
    account.verified = Date.now();
    account.verificationToken = null;
    await account.save();
}

async function forgotPassword({ email }, origin) {
    const account = await db.Account.findOne({ where: { email } });
    if (!account) return; // silently fail
    account.resetToken = randomTokenString();
    account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await account.save();
    await sendPasswordResetEmail(account, origin);
}

async function validateResetToken({ token }) {
    const account = await db.Account.findOne({ where: { resetToken: token } });
    if (!account || account.resetTokenExpires < Date.now())
        throw 'Invalid token';
}

async function resetPassword({ token, password }) {
    const account = await db.Account.findOne({ where: { resetToken: token } });
    if (!account || account.resetTokenExpires < Date.now())
        throw 'Invalid token';
    account.passwordHash = bcrypt.hashSync(password, 10);
    account.passwordReset = Date.now();
    account.resetToken = null;
    account.resetTokenExpires = null;
    await account.save();
}

async function getAll() {
    const accounts = await db.Account.findAll();
    return accounts.map(basicDetails);
}

async function getById(id) {
    const account = await getAccount(id);
    return basicDetails(account);
}

async function create(params) {
    if (await db.Account.findOne({ where: { email: params.email } }))
        throw `Email "${params.email}" is already registered`;
    const account = new db.Account(params);
    account.passwordHash = bcrypt.hashSync(params.password, 10);
    account.verified = Date.now();
    await account.save();
    return basicDetails(account);
}

async function update(id, params) {
    const account = await getAccount(id);
    if (params.password) params.passwordHash = bcrypt.hashSync(params.password, 10);
    params.updated = Date.now();
    Object.assign(account, params);
    await account.save();
    return basicDetails(account);
}

async function _delete(id) {
    const account = await getAccount(id);
    await account.destroy();
}

// helpers
async function getAccount(id) {
    const account = await db.Account.findByPk(id);
    if (!account) throw 'Account not found';
    return account;
}

async function getRefreshToken(token) {
    const refreshToken = await db.RefreshToken.findOne({ where: { token } });
    if (!refreshToken || !isActive(refreshToken)) throw 'Invalid token';
    return refreshToken;
}

function isActive(token) {
    return !token.revoked && new Date() < new Date(token.expires);
}

function generateJwtToken(account) {
    return jwt.sign({ sub: account.id, id: account.id }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

async function generateRefreshToken(account, ipAddress) {
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

function basicDetails(account) {
    const { id, title, firstName, lastName, email, role, created, updated, verified } = account;
    return { id, title, firstName, lastName, email, role, created, updated, isVerified: !!verified };
}

async function sendVerificationEmail(account, origin) {
    const verifyUrl = `${origin}/account/verify-email?token=${account.verificationToken}`;
    console.log('Sending verification email to:', account.email);
    console.log('Verify URL:', verifyUrl);
    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Verify Email',
        html: `<p>Please click the link below to verify your email:</p><a href="${verifyUrl}">${verifyUrl}</a>`
    });
}

async function sendPasswordResetEmail(account, origin) {
    const resetUrl = `${origin}/account/reset-password?token=${account.resetToken}`;
    await sendEmail({
        to: account.email,
        subject: 'Sign-up Verification API - Reset Password',
        html: `<p>Please click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a>`
    });
}

module.exports = { authenticate, refreshToken, revokeToken, register, verifyEmail, forgotPassword, validateResetToken, resetPassword, getAll, getById, create, update, delete: _delete };