CREATE TABLE `acquisition_config` (
	`owner` text PRIMARY KEY NOT NULL,
	`abandon_minutes` integer DEFAULT 1440 NOT NULL,
	`attribution_days` integer DEFAULT 90 NOT NULL,
	`retention_days` integer DEFAULT 180 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `acquisition_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`form_slug` text NOT NULL,
	`session_key` text NOT NULL,
	`event` text NOT NULL,
	`step` text,
	`device` text NOT NULL,
	`attribution` text NOT NULL,
	`submission_id` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `acquisition_session` ON `acquisition_events` (`owner`,`form_slug`,`session_key`);--> statement-breakpoint
CREATE TABLE `offer_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`offer_id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `offer_seats` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`offer_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL,
	`released` text,
	`reason` text,
	FOREIGN KEY (`offer_id`) REFERENCES `site_offers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `commercial_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `seat_contract` ON `offer_seats` (`owner`,`contract_id`);--> statement-breakpoint
CREATE TABLE `site_offers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`seat_limit` integer DEFAULT 10 NOT NULL,
	`price_cents` integer DEFAULT 30000 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`opened` text NOT NULL,
	`closed` text,
	`revision` integer DEFAULT 1 NOT NULL
);
