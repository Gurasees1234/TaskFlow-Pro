import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { ApiError } from './ApiError.js';

export const isGmailConfigured = () =>
  Boolean(env.gmailUser?.trim() && env.gmailAppPassword?.trim());

const createGmailTransporter = () => {
  if (!isGmailConfigured()) {
    throw new ApiError(
      503,
      'Gmail SMTP is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in backend/.env to send project invitations.'
    );
  }
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.gmailUser.trim(),
      pass: env.gmailAppPassword.trim(),
    },
  });
};

export const verifyEmailConfiguration = async () => {
  if (!isGmailConfigured()) {
    return {
      configured: false,
      verified: false,
      sender: null,
      message: 'GMAIL_USER and GMAIL_APP_PASSWORD environment variables are not configured.',
    };
  }
  try {
    const transporter = createGmailTransporter();
    await transporter.verify();
    return {
      configured: true,
      verified: true,
      sender: env.gmailUser.trim(),
      message: 'Gmail SMTP connection verified.',
    };
  } catch (err) {
    return {
      configured: true,
      verified: false,
      sender: env.gmailUser.trim(),
      message: `Gmail SMTP verification failed: ${err.message}`,
    };
  }
};

export const sendInvitationEmail = async ({
  to,
  projectName,
  projectKey,
  inviterName,
  inviterEmail,
  roleLabel,
  message,
  inviteUrl,
  expiresAt,
}) => {
  const transporter = createGmailTransporter();
  const expiresLabel = new Date(expiresAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const personalBlock = message
    ? `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #141417;background:#f4f4f5;color:#27272a;font-style:italic;">"${message}"</blockquote>`
    : '';

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e4e4e7;border-radius:12px;background:#ffffff;color:#141417;">
      <p style="font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;margin:0 0 8px;">TASKFLOW PRO · PROJECT INVITATION</p>
      <h1 style="font-size:20px;margin:0 0 12px;">You've been invited to join ${projectName} (${projectKey})</h1>
      <p style="font-size:14px;line-height:1.6;color:#3f3f46;margin:0 0 12px;">
        <strong>${inviterName}</strong> (${inviterEmail}) invited you to collaborate on <strong>${projectName}</strong> as <strong>${roleLabel}</strong>.
      </p>
      ${personalBlock}
      <div style="margin:24px 0;">
        <a href="${inviteUrl}" style="display:inline-block;padding:12px 22px;background:#141417;color:#ffffff;text-decoration:none;border-radius:999px;font-weight:600;font-size:14px;">
          Accept Project Invitation
        </a>
      </div>
      <p style="font-size:12px;color:#71717a;line-height:1.5;margin:16px 0 0;">
        This single-use invitation expires on <strong>${expiresLabel}</strong>. If the button above doesn't work, open this link:<br/>
        <span style="word-break:break-all;color:#141417;">${inviteUrl}</span>
      </p>
    </div>
  `;

  const text = [
    `You have been invited to join ${projectName} (${projectKey}) on TaskFlow Pro.`,
    `Invited by: ${inviterName} (${inviterEmail})`,
    `Assigned Role: ${roleLabel}`,
    message ? `Personal message: "${message}"` : '',
    `Accept invitation: ${inviteUrl}`,
    `Expires on: ${expiresLabel}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  try {
    const info = await transporter.sendMail({
      from: `"TaskFlow Pro" <${env.gmailUser.trim()}>`,
      to,
      subject: `[TaskFlow Pro] Invitation to join ${projectName} (${projectKey})`,
      text,
      html,
    });
    return { messageId: info.messageId };
  } catch (err) {
    throw new ApiError(502, `Failed to send Gmail invitation email: ${err.message}`);
  }
};
