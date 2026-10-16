CREATE TABLE `financial_history` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`contract_id` text NOT NULL,
	`action` text NOT NULL,
	`data` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`contract_id`) REFERENCES `commercial_contracts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `financial_quote_receipts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`quote_id` integer NOT NULL,
	`quote_payment_id` text NOT NULL,
	`contract_id` text NOT NULL,
	`payment_id` text NOT NULL,
	`snapshot` text NOT NULL,
	`created` text NOT NULL,
	FOREIGN KEY (`quote_id`) REFERENCES `quotes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`contract_id`) REFERENCES `commercial_contracts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payment_id`) REFERENCES `commercial_payments`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `receipt_owner_quote_payment` ON `financial_quote_receipts` (`owner`,`quote_id`,`quote_payment_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `receipt_owner_payment` ON `financial_quote_receipts` (`owner`,`payment_id`);--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `revision` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `billing` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `active` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `deposit_cents` integer;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `deposit_due` text;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `balance_due` text;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `terms` text;--> statement-breakpoint
ALTER TABLE `commercial_contracts` ADD `updated` text;--> statement-breakpoint
ALTER TABLE `commercial_payments` ADD `kind` text DEFAULT 'Sinal' NOT NULL;--> statement-breakpoint
ALTER TABLE `commercial_payments` ADD `reversed_on` text;--> statement-breakpoint
ALTER TABLE `commercial_payments` ADD `reversal_reason` text;