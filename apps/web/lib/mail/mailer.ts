/** Provider-agnostic transactional mail (mirrors lib/payments). Every
 *  provider implements one send(); the caller never knows which is live. */
export interface Mail {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface Mailer {
  readonly name: string;
  readonly available: boolean;
  send(mail: Mail): Promise<{ delivered: boolean; detail: string }>;
}
