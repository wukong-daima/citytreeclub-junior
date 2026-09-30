CREATE TABLE `club_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`record_id` text NOT NULL,
	`text` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_favorites` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`tree_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_favorites_unique` ON `club_favorites` (`owner`,`tree_id`);--> statement-breakpoint
CREATE TABLE `club_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`text` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_owned` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`tree_id` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`health` text DEFAULT '[]' NOT NULL,
	`girth` integer,
	`size` text DEFAULT 'medium' NOT NULL,
	`species` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_owned_unique` ON `club_owned` (`owner`,`tree_id`);--> statement-breakpoint
CREATE TABLE `club_photos` (
	`key` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`mime` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text DEFAULT '나무 친구' NOT NULL,
	`areas` text DEFAULT '[]' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_records` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`tree_id` text NOT NULL,
	`text` text NOT NULL,
	`photo_key` text,
	`visibility` text NOT NULL,
	`health` text NOT NULL,
	`girth` integer NOT NULL,
	`size` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `club_reports` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`tree_id` text NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'demo_pending' NOT NULL,
	`created_at` text NOT NULL
);
