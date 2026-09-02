CREATE INDEX `idx_audit_admin` ON `admin_audit_log` (`admin_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_audit_time` ON `admin_audit_log` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_challenges_phone` ON `auth_challenges` (`phone`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_challenges_message` ON `auth_challenges` (`message_id`);