CREATE TABLE `actions` (
	`id` text PRIMARY KEY NOT NULL,
	`garden_id` text NOT NULL,
	`action` text NOT NULL,
	`day` text NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`text` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `actions_daily_unique` ON `actions` (`garden_id`,`action`,`day`);--> statement-breakpoint
CREATE TABLE `gardens` (
	`id` text PRIMARY KEY NOT NULL,
	`tree_id` text,
	`decoration` text DEFAULT 'none' NOT NULL,
	`created_at` text NOT NULL
);
