CREATE TABLE "rate_limit_hits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "rl_key_time_idx" ON "rate_limit_hits" USING btree ("key","occurred_at");