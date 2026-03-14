const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send an OTP email to the specified address.
 * @param {string} to - Recipient email address
 * @param {string} otp - The 6-digit OTP code (plain text)
 * @returns {Promise}
 */
async function sendOtpEmail(to, otp) {
  const mailOptions = {
    from: `"Inventra" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Your Verification OTP — Inventra',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0f172a; color: #e2e8f0; border-radius: 16px;">
        <h2 style="margin: 0 0 8px 0; color: #ffffff; font-size: 22px;">Inventra Verification</h2>
        <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px;">Use the code below to verify your identity.</p>
        
        <div style="background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <p style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Your OTP Code</p>
          <p style="margin: 0; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #3b82f6; font-family: 'Courier New', monospace;">${otp}</p>
        </div>
        
        <p style="margin: 0 0 4px 0; color: #94a3b8; font-size: 13px;">⏱ This code will expire in <strong style="color: #f59e0b;">5 minutes</strong>.</p>
        <p style="margin: 0 0 24px 0; color: #64748b; font-size: 12px;">If you did not request this, please ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 16px 0;" />
        <p style="margin: 0; color: #475569; font-size: 11px; text-align: center;">— Inventra Team</p>
      </div>
    `,
    text: `Hello,\n\nYour verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this, please ignore this email.\n\n— Inventra Team`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendOtpEmail };
