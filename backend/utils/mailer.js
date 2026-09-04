const nodemailer = require("nodemailer");

// Generic SMTP transport — works with any provider (Gmail, SendGrid,
// Mailgun, Resend, Amazon SES, a self-hosted server, etc.) via their SMTP
// credentials. If EMAIL_HOST isn't configured, emails aren't actually sent;
// the reset link is logged instead so local development still works.
const transporter = process.env.EMAIL_HOST
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_SECURE === "true",
      auth: process.env.EMAIL_USER
        ? {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          }
        : undefined,
    })
  : null;

const sendPasswordResetEmail = async (to, resetUrl) => {
  if (!transporter) {
    console.log(`[email disabled — no EMAIL_HOST set] Password reset link for ${to}:`);
    console.log(resetUrl);
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "HerdMarket <no-reply@herdmarket.local>",
    to,
    subject: "Reset your HerdMarket password",
    text: `We received a request to reset your HerdMarket password. Open this link to choose a new one (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #0f3d2e;">Reset your password</h2>
        <p>We received a request to reset your HerdMarket password. This link expires in 1 hour.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#0f3d2e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Reset Password
          </a>
        </p>
        <p style="color: #667085; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};

module.exports = { sendPasswordResetEmail };
