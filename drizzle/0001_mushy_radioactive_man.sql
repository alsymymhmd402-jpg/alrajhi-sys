CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publicId` varchar(24) NOT NULL,
	`accessToken` varchar(64) NOT NULL,
	`guestName` varchar(120) NOT NULL,
	`issue` text NOT NULL,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`lastMessagePreview` varchar(280) NOT NULL,
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	`ownerUnread` boolean NOT NULL DEFAULT true,
	`archived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `conversations_publicId_unique` UNIQUE(`publicId`),
	CONSTRAINT `conversations_accessToken_unique` UNIQUE(`accessToken`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`sender` enum('guest','owner') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `conversations_last_message_idx` ON `conversations` (`lastMessageAt`);--> statement-breakpoint
CREATE INDEX `conversations_status_idx` ON `conversations` (`status`);--> statement-breakpoint
CREATE INDEX `conversations_archived_idx` ON `conversations` (`archived`);--> statement-breakpoint
CREATE INDEX `support_messages_conversation_created_idx` ON `support_messages` (`conversationId`,`createdAt`);