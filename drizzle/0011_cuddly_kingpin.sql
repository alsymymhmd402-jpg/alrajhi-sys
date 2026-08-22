CREATE TABLE `client_experiences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contactId` int NOT NULL,
	`headline` varchar(180) NOT NULL DEFAULT 'متابعة طلبك مع المؤسسة',
	`bodyText` text,
	`imageUrl` varchar(900),
	`imagePosition` enum('top','inline','bottom') NOT NULL DEFAULT 'top',
	`imageScale` int NOT NULL DEFAULT 100,
	`accentColor` varchar(7) NOT NULL DEFAULT '#128c7e',
	`textColor` varchar(7) NOT NULL DEFAULT '#0f172a',
	`buttonLabel` varchar(80) NOT NULL DEFAULT 'اطلع على التفاصيل',
	`buttonEnabled` boolean NOT NULL DEFAULT false,
	`buttonSection` enum('support','institution','profile','application') NOT NULL DEFAULT 'application',
	`acceptanceStatus` enum('under_review','accepted','needs_action','not_accepted') NOT NULL DEFAULT 'under_review',
	`acceptanceTitle` varchar(160) NOT NULL DEFAULT 'طلبك قيد المراجعة',
	`acceptanceNote` text,
	`notifyClient` boolean NOT NULL DEFAULT false,
	`version` int NOT NULL DEFAULT 1,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `client_experiences_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_experiences_contactId_unique` UNIQUE(`contactId`)
);
--> statement-breakpoint
CREATE INDEX `client_experiences_contact_idx` ON `client_experiences` (`contactId`);