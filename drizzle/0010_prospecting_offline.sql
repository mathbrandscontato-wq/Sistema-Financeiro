CREATE TABLE `prospecting_companies` (
	`owner` text NOT NULL,
	`identity` text NOT NULL,
	`market` text NOT NULL,
	`data` text NOT NULL,
	`score` integer NOT NULL,
	`grade` text NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `identity`),
	CONSTRAINT "prospecting_score" CHECK("prospecting_companies"."score" between 0 and 10),
	CONSTRAINT "prospecting_grade" CHECK("prospecting_companies"."grade" in ('A','B','C','D'))
);
--> statement-breakpoint
CREATE TABLE `prospecting_handoffs` (
	`owner` text NOT NULL,
	`event_id` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `event_id`),
	FOREIGN KEY (`opportunity_id`) REFERENCES `commercial_opportunities`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `prospecting_outreach` (
	`account` text NOT NULL,
	`local_day` text NOT NULL,
	`recipient` text NOT NULL,
	`attempt_key` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`account`, `local_day`, `recipient`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prospecting_attempt` ON `prospecting_outreach` (`account`,`attempt_key`);--> statement-breakpoint
CREATE TABLE `prospecting_runs` (
	`owner` text NOT NULL,
	`local_day` text NOT NULL,
	`status` text NOT NULL,
	`token` text NOT NULL,
	`attempt` integer NOT NULL,
	`lease_until` integer NOT NULL,
	`report` text NOT NULL,
	PRIMARY KEY(`owner`, `local_day`)
);
