CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(64),
	`name_snapshot` text NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`unit_price` decimal(12,2),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(20) NOT NULL,
	`customer_name` text NOT NULL,
	`phone` varchar(20) NOT NULL,
	`source` varchar(40) NOT NULL DEFAULT 'whatsapp',
	`utm` json,
	`status` enum('new','qualified','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'new',
	`payment_status` enum('pending','paid','refunded') NOT NULL DEFAULT 'pending',
	`shipping` json,
	`total` decimal(12,2),
	`notes` text,
	`created_by` varchar(36),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_order_items_order` ON `order_items` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_orders_phone` ON `orders` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_orders_status` ON `orders` (`status`,`created_at`);