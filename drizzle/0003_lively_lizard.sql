CREATE TABLE `commercial_client_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`client_id` text NOT NULL,
	`action` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `commercial_clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `commercial_clients` ADD `contact_name` text;--> statement-breakpoint
ALTER TABLE `commercial_clients` ADD `notes` text;--> statement-breakpoint
ALTER TABLE `commercial_clients` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_clients` ADD `archived` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `next_action_on` text;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_opportunities` ADD `archived` integer DEFAULT 0 NOT NULL;