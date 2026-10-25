CREATE TABLE `prospecting_approvals` (
	`owner` text NOT NULL,
	`recipient` text NOT NULL,
	`opportunity_id` text NOT NULL,
	`approval_ref` text NOT NULL,
	`approved_by` text NOT NULL,
	`briefing_ref` text NOT NULL,
	`acceptance_event` text NOT NULL,
	`pix_ref` text NOT NULL,
	`capacity` integer NOT NULL,
	`revoked` integer DEFAULT 0 NOT NULL,
	`created` text NOT NULL,
	`updated` text NOT NULL,
	PRIMARY KEY(`owner`, `recipient`)
);
--> statement-breakpoint
CREATE TABLE `prospecting_costs` (
	`owner` text NOT NULL,
	`day` text NOT NULL,
	`provider` text NOT NULL,
	`attempt` text NOT NULL,
	`cost_micros` integer NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `attempt`)
);
