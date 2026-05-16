import { pgTable, uuid, text, timestamp, inet, jsonb, index } from "drizzle-orm/pg-core";

export const signingRequests = pgTable("signing_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  expiredAt: timestamp("expired_at", { withTimezone: true }),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name"),
  senderIp: inet("sender_ip"),
  senderConfirmToken: text("sender_confirm_token").notNull().unique(),
  senderConfirmedAt: timestamp("sender_confirmed_at", { withTimezone: true }),
  senderLookupToken: text("sender_lookup_token").notNull().unique(),
  status: text("status").notNull(),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  metadata: jsonb("metadata"),
}, (t) => ({ statusIdx: index("sr_status_idx").on(t.status), expiresIdx: index("sr_expires_idx").on(t.expiresAt) }));

export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  signingRequestId: uuid("signing_request_id").notNull().references(() => signingRequests.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  originalFormat: text("original_format").notNull(),
  originalBlobUrl: text("original_blob_url").notNull(),
  renderedPdfBlobUrl: text("rendered_pdf_blob_url").notNull(),
  renderedPdfSha256: text("rendered_pdf_sha256").notNull(),
  finalSignedPdfBlobUrl: text("final_signed_pdf_blob_url"),
});

export const signers = pgTable("signers", {
  id: uuid("id").defaultRandom().primaryKey(),
  signingRequestId: uuid("signing_request_id").notNull().references(() => signingRequests.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  signToken: text("sign_token").notNull().unique(),
  signTokenHash: text("sign_token_hash").notNull(),
  status: text("status").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  smsCodeHash: text("sms_code_hash"),
  smsCodeExpiresAt: timestamp("sms_code_expires_at", { withTimezone: true }),
  smsVerifiedAt: timestamp("sms_verified_at", { withTimezone: true }),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  signedIp: inet("signed_ip"),
  signedUserAgent: text("signed_user_agent"),
  consentText: text("consent_text"),
  declineReason: text("decline_reason"),
}, (t) => ({ srIdx: index("signers_sr_idx").on(t.signingRequestId) }));

export const auditEvents = pgTable("audit_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  signingRequestId: uuid("signing_request_id").notNull().references(() => signingRequests.id, { onDelete: "cascade" }),
  signerId: uuid("signer_id").references(() => signers.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull(),
  ip: inet("ip"),
}, (t) => ({ srIdx: index("ae_sr_idx").on(t.signingRequestId), typeIdx: index("ae_type_idx").on(t.eventType) }));
