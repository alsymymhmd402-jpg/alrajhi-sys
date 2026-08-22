CREATE TABLE `customer_ui_audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`configId` int,
	`revisionId` int,
	`action` enum('draft_saved','published','restored','template_applied','status_changed') NOT NULL,
	`summary` varchar(500) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_ui_audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_ui_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`draftDocument` text NOT NULL,
	`draftVersion` int NOT NULL DEFAULT 1,
	`publishedVersion` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_ui_configs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_ui_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`body` varchar(500) NOT NULL,
	`route` varchar(300) NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_ui_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_ui_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`configId` int NOT NULL,
	`version` int NOT NULL,
	`document` text NOT NULL,
	`changeSummary` varchar(500) NOT NULL,
	`status` enum('draft','published','restored') NOT NULL DEFAULT 'draft',
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_ui_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_ui_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` varchar(500),
	`document` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customer_ui_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `customer_ui_audit_logs_contact_created_idx` ON `customer_ui_audit_logs` (`contactId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_ui_configs_contact_idx` ON `customer_ui_configs` (`contactId`);--> statement-breakpoint
CREATE INDEX `customer_ui_notifications_contact_read_idx` ON `customer_ui_notifications` (`contactId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `customer_ui_revisions_config_version_idx` ON `customer_ui_revisions` (`configId`,`version`);--> statement-breakpoint
CREATE INDEX `customer_ui_templates_name_idx` ON `customer_ui_templates` (`name`);