DROP INDEX `support_messages_conversation_created_idx` ON `support_messages`;--> statement-breakpoint
ALTER TABLE `support_messages` ADD `channel` enum('institution','finance','follow_up') DEFAULT 'institution' NOT NULL;--> statement-breakpoint
CREATE INDEX `support_messages_conversation_channel_created_idx` ON `support_messages` (`conversationId`,`channel`,`createdAt`);