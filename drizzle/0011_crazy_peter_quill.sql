CREATE TABLE `institution_status_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`statusId` int NOT NULL,
	`contactId` int NOT NULL,
	`viewedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `institution_status_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `institution_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mediaType` enum('image','video') NOT NULL,
	`storageKey` varchar(700) NOT NULL,
	`mediaUrl` varchar(900) NOT NULL,
	`fileName` varchar(260) NOT NULL,
	`mimeType` varchar(140) NOT NULL,
	`textContent` varchar(500),
	`textColor` varchar(7) NOT NULL DEFAULT '#ffffff',
	`textFont` enum('modern','classic','handwritten','bold') NOT NULL DEFAULT 'modern',
	`textAlign` enum('right','center','left') NOT NULL DEFAULT 'center',
	`textPositionX` int NOT NULL DEFAULT 50,
	`textPositionY` int NOT NULL DEFAULT 76,
	`mediaFilter` enum('none','warm','cool','mono','vivid','fade') NOT NULL DEFAULT 'none',
	`isPublished` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `institution_statuses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `institution_status_views_status_idx` ON `institution_status_views` (`statusId`);--> statement-breakpoint
CREATE INDEX `institution_status_views_contact_idx` ON `institution_status_views` (`contactId`);--> statement-breakpoint
CREATE INDEX `institution_statuses_published_expires_idx` ON `institution_statuses` (`isPublished`,`expiresAt`);--> statement-breakpoint
CREATE INDEX `institution_statuses_created_idx` ON `institution_statuses` (`createdAt`);