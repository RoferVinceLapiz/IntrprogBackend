const nodemailer = require('nodemailer');
require('dotenv').config();

module.exports = sendEmail;

async function sendEmail({ to, subject, html }) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject,
            html
        });
        console.log('Email sent successfully:', info.messageId);
    } catch (err) {
        console.error('Email sending failed:', err.message);
        throw err;
    }
}