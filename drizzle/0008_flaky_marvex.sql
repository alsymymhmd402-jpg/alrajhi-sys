CREATE TABLE `guest_phone_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`invitationId` int NOT NULL,
	`phone` varchar(32) NOT NULL,
	`codeHash` varchar(180),
	`providerMessageId` varchar(180),
	`status` enum('pending','verified','expired','blocked') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`expiresAt` timestamp NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `guest_phone_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `guest_phone_challenges_invite_phone_idx` ON `guest_phone_challenges` (`invitationId`,`phone`);--> statement-breakpoint
CREATE INDEX `guest_phone_challenges_status_expiry_idx` ON `guest_phone_challenges` (`status`,`expiresAt`);