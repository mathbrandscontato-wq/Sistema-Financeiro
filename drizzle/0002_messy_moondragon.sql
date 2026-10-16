CREATE TABLE `commercial_clients` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`identity_key` text NOT NULL,
	`display_name` text NOT NULL,
	`segment` text,
	`origin` text,
	`email` text,
	`phone` text,
	`created` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `client_owner_identity` ON `commercial_clients` (`owner`,`identity_key`);--> statement-breakpoint
CREATE TABLE `commercial_contracts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text NOT NULL,
	`payment_knowledge` text NOT NULL,
	`confirmed_on` text,
	`reference_date` text,
	`created` text NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contract_owner_opportunity` ON `commercial_contracts` (`owner`,`opportunity_id`);--> statement-breakpoint
CREATE TABLE `commercial_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`action` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commercial_import_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`namespace` text NOT NULL,
	`source_sha256` text NOT NULL,
	`source_name` text NOT NULL,
	`source_document` text NOT NULL,
	`report` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `batch_owner_source` ON `commercial_import_batches` (`owner`,`namespace`,`source_sha256`);--> statement-breakpoint
CREATE TABLE `commercial_import_rows` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`namespace` text NOT NULL,
	`external_key` text NOT NULL,
	`content_hash` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`batch_id` text NOT NULL,
	`source` text NOT NULL,
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `import_owner_external` ON `commercial_import_rows` (`owner`,`namespace`,`external_key`);--> statement-breakpoint
CREATE TABLE `commercial_opportunities` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`client_id` text NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer,
	`stage` text NOT NULL,
	`project_stage` text,
	`briefing` text,
	`next_action` text,
	`notes` text,
	`reference_date` text,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `commercial_clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commercial_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`contract_id` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_on` text,
	`reference_date` text,
	`confirmation` text NOT NULL,
	`evidence` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `commercial_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commercial_quote_links` (
	`quote_id` integer PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_owner_opportunity` ON `commercial_quote_links` (`owner`,`opportunity_id`);