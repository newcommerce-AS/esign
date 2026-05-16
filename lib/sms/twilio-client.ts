import twilio from "twilio";

function devMode() {
  return !process.env.TWILIO_ACCOUNT_SID;
}

export async function sendSms(to: string, body: string): Promise<void> {
  if (devMode()) {
    console.warn(`[dev-sms] TO: ${to} | BODY: ${body}`);
    return;
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({ from: process.env.TWILIO_FROM_NUMBER!, to, body });
}
