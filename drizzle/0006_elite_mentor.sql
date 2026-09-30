ALTER TABLE `applications` ADD `tree_id` text;--> statement-breakpoint
UPDATE `applications` SET `tree_id` = (SELECT `tree_id` FROM `gardens` WHERE `gardens`.`id` = `applications`.`garden_id`);
