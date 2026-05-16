import { z } from "zod";

const E164 = /^\+[1-9]\d{6,14}$/;

export const createSigningRequestSchema = z.object({
  sender_email: z.string().email(),
  sender_name: z.string().min(1).max(200).optional(),
  document: z.object({
    filename: z.string().min(1).max(255),
    format: z.enum(["pdf", "markdown", "text"]),
    content_base64: z.string().min(1),
  }),
  signers: z.array(z.object({
    name: z.string().min(1).max(200),
    email: z.string().email(),
    phone: z.string().regex(E164).optional(),
  })).min(1).max(10),
  expires_in_days: z.number().int().min(1).max(60).default(30),
  webhook_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateSigningRequestInput = z.infer<typeof createSigningRequestSchema>;

export const signActionSchema = z.object({
  name: z.string().min(1).max(200),
  consent: z.literal(true),
});

export const declineSchema = z.object({
  reason: z.string().min(1).max(500),
});

export const smsVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/),
});
