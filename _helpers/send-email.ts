import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export default async function sendEmail({
  to,
  subject,
  html
}: SendEmailParams): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
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
  } catch (err: any) {
    console.error('Email sending failed:', err.message);
    throw err;
  }
}