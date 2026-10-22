CREATE TABLE `prospecting_accounts` (
	`owner` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`dry_run` integer DEFAULT 1 NOT NULL,
	`kill_switch` integer DEFAULT 1 NOT NULL,
	`config` text DEFAULT '{}' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospecting_account_identity` ON `prospecting_accounts` (`account`);--> statement-breakpoint
CREATE TABLE `prospecting_consents` (
	`owner` text NOT NULL,
	`recipient` text NOT NULL,
	`channel` text NOT NULL,
	`brand` text NOT NULL,
	`purpose` text NOT NULL,
	`evidence` text NOT NULL,
	`granted_at` text NOT NULL,
	`expires_at` text,
	`revoked_at` text,
	`opt_out` integer DEFAULT 0 NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `recipient`)
);
--> statement-breakpoint
CREATE TABLE `prospecting_conversations` (
	`owner` text NOT NULL,
	`recipient` text NOT NULL,
	`opportunity_id` text,
	`paused` integer DEFAULT 0 NOT NULL,
	`opted_out` integer DEFAULT 0 NOT NULL,
	`last_inbound` text,
	`lock_token` text,
	`lock_until` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `recipient`)
);
--> statement-breakpoint
CREATE INDEX `prospecting_conversation_queue` ON `prospecting_conversations` (`owner`,`paused`,`updated`);--> statement-breakpoint
CREATE TABLE `prospecting_inbox` (
	`account` text NOT NULL,
	`event_id` text NOT NULL,
	`owner` text NOT NULL,
	`recipient` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`created` text NOT NULL,
	`processed` text,
	PRIMARY KEY(`account`, `event_id`)
);
--> statement-breakpoint
CREATE INDEX `prospecting_inbox_queue` ON `prospecting_inbox` (`owner`,`state`,`created`);--> statement-breakpoint
CREATE TABLE `prospecting_outbox` (
	`owner` text NOT NULL,
	`key` text NOT NULL,
	`account` text NOT NULL,
	`recipient` text NOT NULL,
	`channel` text NOT NULL,
	`payload` text NOT NULL,
	`state` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`token` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`next_attempt` integer DEFAULT 0 NOT NULL,
	`provider_id` text,
	`error_code` text,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `key`)
);
--> statement-breakpoint
CREATE INDEX `prospecting_outbox_queue` ON `prospecting_outbox` (`owner`,`state`,`next_attempt`);