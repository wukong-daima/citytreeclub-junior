CREATE TABLE `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`garden_id` text NOT NULL,
	`kind` text NOT NULL,
	`message` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `applications_kind_unique` ON `applications` (`garden_id`,`kind`);--> statement-breakpoint
CREATE TABLE `game_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`garden_id` text NOT NULL,
	`game` text NOT NULL,
	`targets` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`garden_id`) REFERENCES `gardens`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `gardens` ADD `nickname` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `gardens` ADD `tutorial_completed` integer DEFAULT 0 NOT NULL;