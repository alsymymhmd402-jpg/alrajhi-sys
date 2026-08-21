ALTER TABLE `agent_proposals` ADD `executionStartedAt` timestamp;--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD `executionProgress` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD `executionStage` varchar(120);--> statement-breakpoint
ALTER TABLE `agent_proposals` ADD `verificationResult` text;