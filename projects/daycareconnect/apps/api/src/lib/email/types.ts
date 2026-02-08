/**
 * Email provider abstraction types.
 *
 * The business logic depends only on the EmailProvider interface.
 * Concrete implementations (SES, SendGrid, console, etc.) live in
 * their own adapter files and are wired up via the factory in index.ts.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailMessage {
  to: EmailRecipient[];
  subject: string;
  /** Plain-text body */
  text: string;
  /** Optional HTML body */
  html?: string;
  /** Reply-to address */
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  /** Provider-specific message ID, if available */
  messageId?: string;
  error?: string;
}

/**
 * Port — any email provider must satisfy this contract.
 */
export interface EmailProvider {
  send(message: EmailMessage): Promise<SendEmailResult>;
  sendBatch(messages: EmailMessage[]): Promise<SendEmailResult[]>;
}
