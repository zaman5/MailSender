import nodemailer from 'nodemailer';

export async function sendOtpEmail(to: string, otp: string, type: 'verify' | 'reset') {
  const subject = type === 'verify' ? 'Verify your MailSender account' : 'Reset your MailSender password';
  const action  = type === 'verify' ? 'activate your account' : 'reset your password';
  const html = `
  <div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:16px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:24px">
      <div style="width:36px;height:36px;background:#6366f1;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;color:#fff">M</div>
      <span style="font-size:20px;font-weight:700;color:#fff">MailSender</span>
    </div>
    <h2 style="color:#e2e8f0;font-size:18px;margin-bottom:8px">Your verification code</h2>
    <p style="color:#94a3b8;margin-bottom:24px;font-size:14px">Use this code to ${action}. Expires in 15 minutes.</p>
    <div style="background:#1e293b;border:2px solid #6366f1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
      <div style="font-size:40px;font-weight:900;letter-spacing:10px;color:#6366f1;font-family:monospace">${otp}</div>
    </div>
    <p style="color:#64748b;font-size:12px">If you didn't request this, ignore this email. Do not share this code.</p>
  </div>`;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[OTP] Code for ${to}: ${otp} (type: ${type})`);
    return;
  }

  // Use explicit Gmail SMTP — works for both @gmail.com and Google Workspace custom domains
  const transport = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  await transport.sendMail({
    from: `"MailSender" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
}
