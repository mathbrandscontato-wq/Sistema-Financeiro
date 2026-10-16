CREATE TABLE `document_exports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`quote_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`template_version` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`snapshot` text NOT NULL,
	`created` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `protection_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`object_key` text NOT NULL,
	`sha256` text NOT NULL,
	`reason` text NOT NULL,
	`created` text NOT NULL
);
