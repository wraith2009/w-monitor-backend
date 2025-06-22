import prisma from "../db/db";
import { sendEmail } from "../config/nodemailer.config";
import type { EmailContent, EmailRecipient } from "../config/nodemailer.config";

export const notifyMonitorDown = async ({
  monitorId,
  region,
  errorMessage,
}: {
  monitorId: number;
  region: string;
  errorMessage?: string;
}) => {
  const recipients = await prisma.monitorAlertRecipient.findMany({
    where: { monitorId },
  });

  if (recipients.length === 0) return;

  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
  });

  if (!monitor) return;

  const emailContent: EmailContent = {
    subject: ` Downtime Alert: ${monitor.websiteName} is unreachable`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2 style="color: #d32f2f;"> Monitor Down Alert</h2>
        <p>Hello,</p>
        <p>This is to inform you that one of your monitored websites is currently <strong>down</strong>.</p>
  
        <table style="margin-top: 20px; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Website:</td>
            <td style="padding: 8px;">${monitor.websiteName}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">URL:</td>
            <td style="padding: 8px;"><a href="${monitor.url}" target="_blank">${monitor.url}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Region:</td>
            <td style="padding: 8px;">${region}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Issue:</td>
            <td style="padding: 8px; color: #d32f2f;">${errorMessage || "No details available."}</td>
          </tr>
        </table>
  
        <p style="margin-top: 20px;">
          We recommend investigating this issue as soon as possible to minimize downtime impact.
        </p>
  
        <p>
          You will receive another notification once the website is back online.
        </p>
  
        <p style="margin-top: 30px;">Regards,<br/><strong>Uptime Monitoring System</strong></p>
      </div>
    `,
    textContent: `Monitor Down Alert
  
  Website: ${monitor.websiteName}
  URL: ${monitor.url}
  Region: ${region}
  Issue: ${errorMessage || "No details available."}
  
  Please check the issue immediately. You will be notified again when the site recovers.
  
  — Uptime Monitoring System`,
  };

  const senderEmail = process.env.ALERT_SENDER_EMAIL || "alerts@yourdomain.com";
  const senderName = process.env.ALERT_SENDER_NAME || "Uptime Monitor";

  for (const recipient of recipients) {
    const emailRecipient: EmailRecipient = {
      email: recipient.email,
      name: recipient.email.split("@")[0], // Optional: derive name
    };

    const result = await sendEmail(
      senderEmail,
      senderName,
      emailRecipient,
      emailContent,
    );

    if (!result.success) {
      console.error(
        `[notifyMonitorDown] Failed to notify ${recipient.email}:`,
        result.error,
      );
    }
  }
};
