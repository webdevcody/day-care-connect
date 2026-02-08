import type { EmailProvider } from "./types";
import { ConsoleEmailProvider } from "./console-provider";
import { SESEmailProvider } from "./ses-provider";

export type { EmailProvider, EmailMessage, EmailRecipient, SendEmailResult } from "./types";

/**
 * Singleton email provider instance.
 *
 * Set EMAIL_PROVIDER=ses in your env to use AWS SES.
 * Defaults to the console provider for local development.
 */
let provider: EmailProvider | null = null;

export function getEmailProvider(): EmailProvider {
  if (!provider) {
    const kind = process.env.EMAIL_PROVIDER ?? "console";

    switch (kind) {
      case "ses":
        provider = new SESEmailProvider();
        break;
      case "console":
      default:
        provider = new ConsoleEmailProvider();
        break;
    }
  }

  return provider;
}

/**
 * Allows tests / custom setups to inject their own provider.
 */
export function setEmailProvider(p: EmailProvider) {
  provider = p;
}
