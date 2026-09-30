ALTER TABLE `actions` ADD `tree_id` text;--> statement-breakpoint
ALTER TABLE `game_runs` ADD `tree_id` text;--> statement-breakpoint
ALTER TABLE `club_owned` ADD `decoration` text DEFAULT 'none' NOT NULL;--> statement-breakpoint
UPDATE `actions` SET `tree_id` = (SELECT `tree_id` FROM `gardens` WHERE `gardens`.`id` = `actions`.`garden_id`);--> statement-breakpoint
UPDATE `game_runs` SET `tree_id` = (SELECT `tree_id` FROM `gardens` WHERE `gardens`.`id` = `game_runs`.`garden_id`);--> statement-breakpoint
UPDATE `actions` SET `day` = `tree_id` WHERE `action` = 'rename' AND `day` = 'once' AND `tree_id` IS NOT NULL;--> statement-breakpoint
UPDATE `club_owned` SET `decoration` = (SELECT `decoration` FROM `gardens` WHERE `gardens`.`id` = `club_owned`.`owner`) WHERE `tree_id` = (SELECT `tree_id` FROM `gardens` WHERE `gardens`.`id` = `club_owned`.`owner`);
