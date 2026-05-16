CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signing_request_id" uuid NOT NULL,
	"signer_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" "inet"
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signing_request_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"original_format" text NOT NULL,
	"original_blob_url" text NOT NULL,
	"rendered_pdf_blob_url" text NOT NULL,
	"rendered_pdf_sha256" text NOT NULL,
	"final_signed_pdf_blob_url" text
);
--> statement-breakpoint
CREATE TABLE "signers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signing_request_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"sign_token" text NOT NULL,
	"sign_token_hash" text NOT NULL,
	"status" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"sms_code_hash" text,
	"sms_code_expires_at" timestamp with time zone,
	"sms_verified_at" timestamp with time zone,
	"signed_at" timestamp with time zone,
	"signed_ip" "inet",
	"signed_user_agent" text,
	"consent_text" text,
	"decline_reason" text,
	CONSTRAINT "signers_sign_token_unique" UNIQUE("sign_token")
);
--> statement-breakpoint
CREATE TABLE "signing_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"expired_at" timestamp with time zone,
	"sender_email" text NOT NULL,
	"sender_name" text,
	"sender_ip" "inet",
	"sender_confirm_token" text NOT NULL,
	"sender_confirmed_at" timestamp with time zone,
	"sender_lookup_token" text NOT NULL,
	"status" text NOT NULL,
	"webhook_url" text,
	"webhook_secret" text,
	"metadata" jsonb,
	CONSTRAINT "signing_requests_sender_confirm_token_unique" UNIQUE("sender_confirm_token"),
	CONSTRAINT "signing_requests_sender_lookup_token_unique" UNIQUE("sender_lookup_token")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_signing_request_id_signing_requests_id_fk" FOREIGN KEY ("signing_request_id") REFERENCES "public"."signing_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_signer_id_signers_id_fk" FOREIGN KEY ("signer_id") REFERENCES "public"."signers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_signing_request_id_signing_requests_id_fk" FOREIGN KEY ("signing_request_id") REFERENCES "public"."signing_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signers" ADD CONSTRAINT "signers_signing_request_id_signing_requests_id_fk" FOREIGN KEY ("signing_request_id") REFERENCES "public"."signing_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ae_sr_idx" ON "audit_events" USING btree ("signing_request_id");--> statement-breakpoint
CREATE INDEX "ae_type_idx" ON "audit_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "signers_sr_idx" ON "signers" USING btree ("signing_request_id");--> statement-breakpoint
CREATE INDEX "sr_status_idx" ON "signing_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sr_expires_idx" ON "signing_requests" USING btree ("expires_at");