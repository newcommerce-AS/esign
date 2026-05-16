import { Resend } from "resend";
import { render } from "@react-email/components";
import type { ReactElement } from "react";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const FROM = process.env.RESEND_FROM_ADDRESS ?? "no-reply@localhost";

function devMode() {
  return !process.env.RESEND_API_KEY;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  react: ReactElement;
  attachments?: { filename: string; content: Buffer }[];
}) {
  const html = await render(opts.react);
  if (devMode()) {
    const dir = path.join(process.cwd(), ".dev-mail");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeTo = opts.to.replace(/[^a-z0-9@._-]/gi, "_");
    const file = path.join(dir, `${stamp}-${safeTo}.html`);
    writeFileSync(file, html);
    const attachmentInfo = opts.attachments?.length
      ? ` | ATTACHMENTS: ${opts.attachments.map((a) => a.filename).join(", ")}`
      : "";
    console.warn(`[dev-mail] TO: ${opts.to} | SUBJECT: ${opts.subject} | FILE: ${file}${attachmentInfo}`);
    return { id: "dev-mode" };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  return await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html,
    attachments: opts.attachments,
  });
}
