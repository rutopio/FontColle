ALTER TABLE `family` ADD `license_dir` text;--> statement-breakpoint
ALTER TABLE `family` ADD `version` real;--> statement-breakpoint
ALTER TABLE `family` ADD `version_string` text;--> statement-breakpoint
ALTER TABLE `family` ADD `created_ms` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `modified_ms` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `date_added` text;--> statement-breakpoint
ALTER TABLE `family` ADD `weight_class` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `width_class` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `fs_type` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `glyph_count` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `char_count` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `units_per_em` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `has_stat` integer;--> statement-breakpoint
ALTER TABLE `family` ADD `primary_script` text;--> statement-breakpoint
ALTER TABLE `family` ADD `panose` text;--> statement-breakpoint
CREATE INDEX `family_class_idx` ON `family` (`primary_class`);--> statement-breakpoint
CREATE INDEX `family_variable_idx` ON `family` (`is_variable`);