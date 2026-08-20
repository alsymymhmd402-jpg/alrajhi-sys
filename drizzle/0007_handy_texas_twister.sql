CREATE TABLE `agent_alerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`severity` enum('info','warning','error') NOT NULL DEFAULT 'warning',
	`title` varchar(220) NOT NULL,
	`detail` text NOT NULL,
	`source` varchar(120) NOT NULL,
	`status` enum('open','dismissed','resolved') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	CONSTRAINT `agent_alerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`role` enum('owner','assistant','system') NOT NULL,
	`kind` enum('chat','proposal','alert','execution') NOT NULL DEFAULT 'chat',
	`content` text NOT NULL,
	`proposalId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `agent_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_proposals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`threadId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`summary` text NOT NULL,
	`actionType` enum('update_setting','acknowledge_alert','manual_development') NOT NULL,
	`actionPayload` text NOT NULL,
	`impact` varchar(500) NOT NULL,
	`status` enum('draft','approved','cancelled','executed','failed') NOT NULL DEFAULT 'draft',
	`approvedAt` timestamp,
	`executedAt` timestamp,
	`executionResult` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_proposals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_threads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(180) NOT NULL,
	`status` enum('active','archived') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_threads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `agent_alerts_status_created_idx` ON `agent_alerts` (`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `agent_messages_thread_created_idx` ON `agent_messages` (`threadId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `agent_proposals_thread_status_idx` ON `agent_proposals` (`threadId`,`status`);--> statement-breakpoint
CREATE INDEX `agent_threads_status_updated_idx` ON `agent_threads` (`status`,`updatedAt`);