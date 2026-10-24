ALTER TABLE `prospecting_conversations` ADD `last_real_inbound` text;--> statement-breakpoint
ALTER TABLE `prospecting_conversations` ADD `last_simulated_inbound` text;--> statement-breakpoint
ALTER TABLE `prospecting_inbox` ADD `source_mode` text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospecting_inbox` ADD `simulated` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `prospecting_outbox` ADD `source_mode` text DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `prospecting_outbox` ADD `simulated` integer DEFAULT 1 NOT NULL;