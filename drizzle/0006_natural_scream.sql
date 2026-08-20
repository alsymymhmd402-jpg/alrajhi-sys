ALTER TABLE `call_logs` ADD `voiceModelId` int;--> statement-breakpoint
ALTER TABLE `invitations` ADD `voiceModelId` int;--> statement-breakpoint
CREATE INDEX `call_logs_voice_model_idx` ON `call_logs` (`voiceModelId`);--> statement-breakpoint
CREATE INDEX `invitations_voice_model_idx` ON `invitations` (`voiceModelId`);