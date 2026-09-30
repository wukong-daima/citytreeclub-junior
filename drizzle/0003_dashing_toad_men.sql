CREATE TABLE `club_likes` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`record_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `club_likes_unique` ON `club_likes` (`owner`,`record_id`);--> statement-breakpoint
ALTER TABLE `club_comments` ADD `photo_key` text;