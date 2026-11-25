import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export function gmailConfigured() {
  return Boolean(process.env.GMAIL_ADDRESS && process.env.GMAIL_APP_PASSWORD);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.GMAIL_ADDRESS, pass: process.env.GMAIL_APP_PASSWORD },
    });
  }
  return transporter;
}

export type OutMail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  fromName: string;
  inReplyTo?: string | null;
  unsubscribeUrl?: string;
};

export async function sendMail(m: OutMail): Promise<{ messageId: string }> {
  if (!gmailConfigured()) throw new Error("Gmail is not configured");
  const from = process.env.GMAIL_ADDRESS!;
  const headers: Record<string, string> = {};
  if (m.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${m.unsubscribeUrl}>, <mailto:${from}?subject=unsubscribe>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  const info = await getTransporter().sendMail({
    from: { name: m.fromName, address: from },
    to: m.to,
    subject: m.subject,
    text: m.text,
    html: m.html,
    headers,
    ...(m.inReplyTo ? { inReplyTo: m.inReplyTo, references: [m.inReplyTo] } : {}),
  });
  return { messageId: info.messageId };
}
