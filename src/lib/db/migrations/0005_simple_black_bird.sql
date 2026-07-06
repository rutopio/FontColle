ALTER TABLE `family` ADD `popularity_rank` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `trending_rank` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `last_modified` text;--> statement-breakpoint
CREATE INDEX `family_popularity_idx` ON `family` (`popularity_rank`);