ALTER TABLE `club_reports` ADD `kind` text DEFAULT 'error' NOT NULL;--> statement-breakpoint
ALTER TABLE `club_reports` ADD `details` text DEFAULT '{}' NOT NULL;