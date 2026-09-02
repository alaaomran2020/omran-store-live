CREATE TABLE `admin_audit_log` (
	`id` varchar(36) NOT NULL,
	`admin_id` varchar(36),
	`admin_phone` varchar(20),
	`action` varchar(80) NOT NULL,
	`entity_type` varchar(40),
	`entity_id` varchar(100),
	`outcome` enum('ok','denied','error') NOT NULL DEFAULT 'ok',
	`detail` json,
	`ip_hash` varchar(64),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `admin_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `auth_challenges` (
	`id` varchar(36) NOT NULL,
	`admin_id` varchar(36) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`link_token_hash` varchar(64),
	`channel` varchar(20) NOT NULL DEFAULT 'whatsapp',
	`attempts` int NOT NULL DEFAULT 0,
	`max_attempts` int NOT NULL DEFAULT 5,
	`expires_at` timestamp NOT NULL,
	`consumed_at` timestamp,
	`revoked_at` timestamp,
	`delivery_status` varchar(20) NOT NULL DEFAULT 'pending',
	`message_id` varchar(128),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auth_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `admin_sessions` (
	`id` varchar(36) NOT NULL,
	`admin_id` varchar(36) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_seen_at` timestamp NOT NULL DEFAULT (now()),
	`revoked_at` timestamp,
	`user_agent` text,
	`ip_hash` varchar(64),
	CONSTRAINT `admin_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_sessions_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `admin_users` (
	`id` varchar(36) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`full_name` text NOT NULL,
	`role` enum('super_admin','limited_admin') NOT NULL DEFAULT 'limited_admin',
	`permissions` json NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`last_login_at` timestamp,
	CONSTRAINT `admin_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `admin_users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `product_overrides` (
	`product_id` varchar(64) NOT NULL,
	`name` text,
	`price` decimal(12,2),
	`description` text,
	`image` text,
	`active` boolean,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`updated_by` varchar(36),
	CONSTRAINT `product_overrides_product_id` PRIMARY KEY(`product_id`)
);
--> statement-breakpoint
ALTER TABLE `auth_challenges` ADD CONSTRAINT `auth_challenges_admin_id_admin_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `admin_sessions` ADD CONSTRAINT `admin_sessions_admin_id_admin_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `admin_users`(`id`) ON DELETE cascade ON UPDATE no action;