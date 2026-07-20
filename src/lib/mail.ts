import { Resend } from 'resend';
import { APP_URL } from './constants';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_key');
const fromEmail = process.env.EMAIL_FROM || 'noreply@redbeard.com';

export async function sendResetEmail(email: string, token: string) {
  const resetLink = `${APP_URL}/reset-password?token=${token}`;

  // If no real API key is configured, just log it. 
  if (!process.env.RESEND_API_KEY) {
    console.log(`[MAILER MOCK] Password reset link for ${email}: ${resetLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: `REDBEARD <${fromEmail}>`,
      to: email,
      subject: 'Reset your password - REDBEARD',
      html: `
        <div>
          <h1>Reset your password</h1>
          <p>You requested a password reset for your REDBEARD account.</p>
          <p>Click the link below to set a new password:</p>
          <a href="${resetLink}">${resetLink}</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send reset email:', error);
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${APP_URL}/verify-email?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[MAILER MOCK] Verification link for ${email}: ${verifyLink}`);
    return;
  }

  try {
    await resend.emails.send({
      from: `REDBEARD <${fromEmail}>`,
      to: email,
      subject: 'Verify your email - REDBEARD',
      html: `
        <div>
          <h1>Verify your email</h1>
          <p>Welcome to REDBEARD!</p>
          <p>Click the link below to verify your email address:</p>
          <a href="${verifyLink}">${verifyLink}</a>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }
}
