CREATE TABLE `family` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_dir` text NOT NULL,
	`name` text NOT NULL,
	`designer` text,
	`category` text,
	`primary_class` text NOT NULL,
	`license` text,
	`is_variable` integer NOT NULL,
	`subsets` text,
	`primary_ttf` text,
	`content_hash` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `family_family_dir_unique` ON `family` (`family_dir`);--> statement-breakpoint
CREATE TABLE `family_axis` (
	`family_id` integer NOT NULL,
	`axis_tag` text NOT NULL,
	`axis_name` text,
	`min_value` real,
	`default_value` real,
	`max_value` real,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `family_axis_tag_idx` ON `family_axis` (`axis_tag`);--> statement-breakpoint
CREATE INDEX `family_axis_family_idx` ON `family_axis` (`family_id`);--> statement-breakpoint
CREATE TABLE `family_feature` (
	`family_id` integer NOT NULL,
	`feature_tag` text NOT NULL,
	`table_kind` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `family_feature_tag_idx` ON `family_feature` (`feature_tag`);--> statement-breakpoint
CREATE INDEX `family_feature_family_idx` ON `family_feature` (`family_id`);--> statement-breakpoint
CREATE TABLE `family_instance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`name` text NOT NULL,
	`coords` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `family_instance_family_idx` ON `family_instance` (`family_id`);