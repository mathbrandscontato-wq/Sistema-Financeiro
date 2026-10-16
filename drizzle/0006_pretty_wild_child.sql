CREATE TABLE `intake_acquisition` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`token_hash` text NOT NULL,
	`attribution` text NOT NULL,
	`started_on` text,
	`diagnosed_on` text,
	`captured_on` text,
	`opportunity_id` text,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payment_event_inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`event_id` text NOT NULL,
	`source` text NOT NULL,
	`contract_id` text NOT NULL,
	`payload` text NOT NULL,
	`state` text NOT NULL,
	`review` text,
	`reviewed_on` text,
	`payment_id` text,
	`created` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `commercial_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `external_payment_owner_source_event` ON `payment_event_inbox` (`owner`,`source`,`event_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `external_payment_receipt` ON `payment_event_inbox` (`owner`,`payment_id`);--> statement-breakpoint
CREATE TABLE `workspace_access_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `member_owner_email` ON `workspace_members` (`owner`,`email`);--> statement-breakpoint
ALTER TABLE `commercial_clients` ADD `instagram` text;--> statement-breakpoint
ALTER TABLE `commercial_clients` ADD `brand_site` text;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `assignee_email` text;
--> statement-breakpoint
INSERT INTO intake_acquisition(id,owner,token_hash,attribution,diagnosed_on,captured_on,opportunity_id,created)
SELECT s.id,s.owner,s.token_hash,s.attribution,s.created,c.created,c.opportunity_id,s.created FROM intake_sessions s LEFT JOIN intake_captures c ON c.session_id=s.id AND c.owner=s.owner;
