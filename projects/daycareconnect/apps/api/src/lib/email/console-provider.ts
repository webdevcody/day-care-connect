import type { EmailMessage, EmailProvider, SendEmailResult } from "./types";

/**
 * Adapter — logs emails to the console instead of sending them.
 * Used for local development and testing.
 */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: EmailMessage): Promise<SendEmailResult> {
    console.log("─── Email (console provider) ───────────────────────");
    console.log(`  To:      ${message.to.map((r) => `${r.name ?? ""} <${r.email}>`).join(", ")}`);
    console.log(`  Subject: ${message.subject}`);
    console.log(`  ReplyTo: ${message.replyTo ?? "(none)"}`);
    console.log(`  Body:\n${message.text}`);
    console.log("────────────────────────────────────────────────────");

    return { success: true, messageId: `console-${Date.now()}` };
  }

  async sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]> {
    const results: SendEmailResult[] = [];
    for (const message of messages) {
      results.push(await this.send(message));
    }
    return results;
  }
}
