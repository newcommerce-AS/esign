import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_ADDRESS!;

export async function sendEmail(opts: {
  to: string; subject: string; react: ReactElement;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const html = await render(opts.react);
  return await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html, attachments: opts.attachments });
}
