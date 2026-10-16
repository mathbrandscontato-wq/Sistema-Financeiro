CREATE TABLE `intake_captures` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`session_id` text NOT NULL,
	`client_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`contact` text NOT NULL,
	`privacy_version` text NOT NULL,
	`marketing` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `intake_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `commercial_clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_capture_session` ON `intake_captures` (`owner`,`session_id`);--> statement-breakpoint
CREATE TABLE `intake_contact_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`key` text NOT NULL,
	`client_id` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `commercial_clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_contact_owner_key` ON `intake_contact_keys` (`owner`,`key`);--> statement-breakpoint
CREATE TABLE `intake_forms` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`slug` text NOT NULL,
	`version` integer NOT NULL,
	`definition` text NOT NULL,
	`published` integer DEFAULT 1 NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_form_slug_version` ON `intake_forms` (`slug`,`version`);--> statement-breakpoint
CREATE TABLE `intake_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`count` integer NOT NULL,
	`expires` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `intake_lead_links` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`client_id` text NOT NULL,
	`form_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `commercial_clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`form_id`) REFERENCES `intake_forms`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_lead_client_form` ON `intake_lead_links` (`owner`,`client_id`,`form_id`);--> statement-breakpoint
CREATE TABLE `intake_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`form_id` text NOT NULL,
	`request_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`answers` text NOT NULL,
	`diagnosis` text NOT NULL,
	`attribution` text NOT NULL,
	`created` text NOT NULL,
	`expires` text NOT NULL,
	FOREIGN KEY (`form_id`) REFERENCES `intake_forms`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `intake_session_request` ON `intake_sessions` (`owner`,`request_id`);--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `origin` text;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `service` text;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `intent` text;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `loss_reason` text;