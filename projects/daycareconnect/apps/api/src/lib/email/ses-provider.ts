import type { EmailMessage, EmailProvider, SendEmailResult } from "./types";

/**
 * Adapter — sends emails via Amazon SES.
 *
 * Requires the following env vars:
 *   AWS_REGION          – e.g. "us-east-1"
 *   SES_FROM_EMAIL      – verified sender, e.g. "noreply@daycareconnect.com"
 *   AWS_ACCESS_KEY_ID   – (loaded by the AWS SDK automatically)
 *   AWS_SECRET_ACCESS_KEY
 *
 * Note: This uses the @aws-sdk/client-ses package. Make sure to install it
 * when you're ready to use this provider in production:
 *   pnpm add @aws-sdk/client-ses
 */
export class SESEmailProvider implements EmailProvider {
  private client: any;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.SES_FROM_EMAIL || "noreply@daycareconnect.com";

    // Lazily import so the app doesn't crash if the SDK isn't installed yet.
    // In production you'd do a proper static import.
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SESClient } = require("@aws-sdk/client-ses");
      this.client = new SESClient({ region: process.env.AWS_REGION || "us-east-1" });
    } catch {
      console.warn(
        "[@aws-sdk/client-ses] not installed — SESEmailProvider will throw at send time."
      );
      this.client = null;
    }
  }

  async send(message: EmailMessage): Promise<SendEmailResult> {
    if (!this.client) {
      return { success: false, error: "@aws-sdk/client-ses is not installed" };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { SendEmailCommand } = require("@aws-sdk/client-ses");

      const command = new SendEmailCommand({
        Source: this.fromEmail,
        Destination: {
          ToAddresses: message.to.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email)),
        },
        ReplyToAddresses: message.replyTo ? [message.replyTo] : undefined,
        Message: {
          Subject: { Data: message.subject, Charset: "UTF-8" },
          Body: {
            ...(message.html ? { Html: { Data: message.html, Charset: "UTF-8" } } : {}),
            Text: { Data: message.text, Charset: "UTF-8" },
          },
        },
      });

      const result = await this.client.send(command);
      return { success: true, messageId: result.MessageId };
    } catch (err: any) {
      console.error("SES send error:", err);
      return { success: false, error: err.message ?? String(err) };
    }
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]> {
    // SES doesn't have a native batch API for different recipients/subjects,
    // so we send them individually. For high volume, consider SES v2 bulk.
    return Promise.all(messages.map((m) => this.send(m)));
  }
}
