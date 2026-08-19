CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`lastActivityAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guest_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`contactId` int NOT NULL,
	`conversationId` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `guest_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `guest_sessions_publicId_unique` UNIQUE(`publicId`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `contactId` int;--> statement-breakpoint
CREATE INDEX `contacts_last_activity_idx` ON `contacts` (`lastActivityAt`);--> statement-breakpoint
CREATE INDEX `guest_sessions_contact_idx` ON `guest_sessions` (`contactId`);--> statement-breakpoint
CREATE INDEX `guest_sessions_conversation_idx` ON `guest_sessions` (`conversationId`);--> statement-breakpoint
CREATE INDEX `conversations_contact_idx` ON `conversations` (`contactId`);