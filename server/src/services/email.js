/**
 * Email service: weekly parent report (Nodemailer).
 */
import nodemailer from 'nodemailer';

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendParentWeeklyReport(parentEmail, studentName, report) {
  const transport = getTransporter();
  if (!transport) {
    console.warn('SMTP not configured; skipping parent email to', parentEmail);
    return;
  }
  const html = `
    <h2>Weekly Study Report: ${studentName}</h2>
    <p><strong>Total study hours:</strong> ${report.totalHours ?? 0}</p>
    <p><strong>Complete sessions:</strong> ${report.completeSessions ?? 0}</p>
    <p><strong>Incomplete sessions:</strong> ${report.incompleteSessions ?? 0}</p>
    <p><strong>Focus score (avg):</strong> ${report.focusScore ?? '-'}</p>
    <p><strong>Weak subjects:</strong> ${(report.weakSubjects || []).join(', ') || 'None'}</p>
    <p><strong>Remark:</strong> ${report.remark || '-'}</p>
    <p>— PrepX</p>
  `;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: parentEmail,
    subject: `Weekly Study Report: ${studentName}`,
    html,
  });
}
