CREATE TABLE `message_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`messageId` int NOT NULL,
	`storageKey` varchar(700) NOT NULL,
	`url` varchar(900) NOT NULL,
	`fileName` varchar(260) NOT NULL,
	`mimeType` varchar(140) NOT NULL,
	`sizeBytes` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `service_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestNumber` varchar(32) NOT NULL,
	`contactId` int NOT NULL,
	`conversationId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`status` enum('new','in_progress','waiting','completed','closed') NOT NULL DEFAULT 'new',
	`lastUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `service_requests_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_requests_requestNumber_unique` UNIQUE(`requestNumber`)
);
--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(120) NOT NULL,
	`settingValue` text NOT NULL,
	`updatedByUserId` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
CREATE TABLE `voice_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(140) NOT NULL,
	`provider` varchar(120) NOT NULL,
	`voiceId` varchar(180) NOT NULL,
	`status` enum('active','disabled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `voice_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `contacts` ADD `email` varchar(320);--> statement-breakpoint
ALTER TABLE `contacts` ADD `phone` varchar(40);--> statement-breakpoint
ALTER TABLE `contacts` ADD `avatarUrl` varchar(600);--> statement-breakpoint
ALTER TABLE `contacts` ADD `extraData` text;--> statement-breakpoint
ALTER TABLE `contacts` ADD `connectionStatus` enum('online','offline','away') DEFAULT 'offline' NOT NULL;--> statement-breakpoint
CREATE INDEX `message_attachments_message_idx` ON `message_attachments` (`messageId`);--> statement-breakpoint
CREATE INDEX `service_requests_contact_idx` ON `service_requests` (`contactId`);--> statement-breakpoint
CREATE INDEX `service_requests_conversation_idx` ON `service_requests` (`conversationId`);--> statement-breakpoint
CREATE INDEX `service_requests_status_idx` ON `service_requests` (`status`);--> statement-breakpoint
CREATE INDEX `voice_models_status_idx` ON `voice_models` (`status`);