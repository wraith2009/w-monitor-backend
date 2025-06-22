import nodemailer from "nodemailer";

export type EmailContent = {
  subject: string;
  htmlContent: string;
  textContent?: string;
};

export type EmailRecipient = {
  email: string;
  name?: string;
};

export type EmailResponse = {
  success: boolean;
  messageId?: string;
  error?: {
    code?: string | number;
    message: string;
    details?: any;
  };
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const createTransporter = () => {
  console.log("[sendEmail] Creating transporter...");
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp-relay.brevo.com",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

export const sendEmail = async (
  senderEmail: string,
  senderName: string,
  recipient: EmailRecipient,
  content: EmailContent,
): Promise<EmailResponse> => {
  console.log("[sendEmail] Entry");
  console.log("[sendEmail] Sender:", senderEmail);
  console.log("[sendEmail] Recipient:", recipient);
  console.log("[sendEmail] Subject:", content.subject);

  try {
    if (!isValidEmail(senderEmail)) {
      console.warn("[sendEmail] Invalid sender email");
      return {
        success: false,
        error: {
          code: "INVALID_SENDER",
          message: `Invalid sender email: ${senderEmail}`,
        },
      };
    }

    if (!isValidEmail(recipient.email)) {
      console.warn("[sendEmail] Invalid recipient email");
      return {
        success: false,
        error: {
          code: "INVALID_RECIPIENT",
          message: `Invalid recipient email: ${recipient.email}`,
        },
      };
    }

    if (!content.subject || !content.htmlContent) {
      console.warn("[sendEmail] Missing email subject or HTML content");
      return {
        success: false,
        error: {
          code: "MISSING_CONTENT",
          message: "Email subject and HTML content are required",
        },
      };
    }

    const transporter = createTransporter();
    console.log("[sendEmail] Transporter created successfully");

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to: `${recipient.name || ""} <${recipient.email}>`,
      subject: content.subject,
      html: content.htmlContent,
      text: content.textContent || "",
    };

    console.log("[sendEmail] Sending email...");
    const result = await transporter.sendMail(mailOptions);
    console.log(
      "[sendEmail] Email sent successfully. Message ID:",
      result.messageId,
    );

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (error: any) {
    console.error("[sendEmail] Error sending email:", error);
    return {
      success: false,
      error: {
        code: error.code || "SMTP_ERROR",
        message: error.message || "Failed to send email",
        details: error,
      },
    };
  }
};
