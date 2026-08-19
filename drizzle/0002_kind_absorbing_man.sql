CREATE TABLE `call_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int,
	`invitationId` int,
	`mode` enum('direct','agent') NOT NULL,
	`status` enum('requested','ringing','connected','ended','failed','cancelled') NOT NULL DEFAULT 'requested',
	`providerConversationId` varchar(160),
	`failureReason` varchar(300),
	`startedAt` timestamp,
	`endedAt` timestamp,
	`durationSeconds` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `call_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(24) NOT NULL,
	`label` varchar(120) NOT NULL,
	`type` enum('reusable','one_time') NOT NULL DEFAULT 'reusable',
	`status` enum('active','revoked','expired') NOT NULL DEFAULT 'active',
	`usageCount` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp,
	`lastUsedAt` timestamp,
	`createdByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `invitationId` int;--> statement-breakpoint
CREATE INDEX `call_logs_conversation_idx` ON `call_logs` (`conversationId`);--> statement-breakpoint
CREATE INDEX `call_logs_invitation_idx` ON `call_logs` (`invitationId`);--> statement-breakpoint
CREATE INDEX `call_logs_created_idx` ON `call_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `invitations_status_idx` ON `invitations` (`status`);--> statement-breakpoint
CREATE INDEX `invitations_expires_idx` ON `invitations` (`expiresAt`);--> statement-breakpoint
CREATE INDEX `conversations_invitation_idx` ON `conversations` (`invitationId`);