CREATE TABLE `family_language` (
	`family_id` integer NOT NULL,
	`lang_id` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `family_language_lang_idx` ON `family_language` (`lang_id`);--> statement-breakpoint
CREATE INDEX `family_language_family_idx` ON `family_language` (`family_id`);--> statement-breakpoint
CREATE TABLE `family_script` (
	`family_id` integer NOT NULL,
	`script` text NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `family`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `family_script_script_idx` ON `family_script` (`script`);--> statement-breakpoint
CREATE INDEX `family_script_family_idx` ON `family_script` (`family_id`);--> statement-breakpoint
ALTER TABLE `family` ADD `cjk_coverage` text;--> statement-breakpoint
ALTER TABLE `family_instance` ADD `italic` integer DEFAULT false NOT NULL;