-- CreateTable
CREATE TABLE `alerts` (
    `id` CHAR(36) NOT NULL,
    `manager_id` CHAR(36) NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `type` ENUM('budget_warning', 'budget_exceeded', 'budget_underuse', 'goal_behind', 'goal_reached', 'sync_failed', 'sync_success') NOT NULL,
    `severity` ENUM('info', 'warning', 'critical', 'success') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `message` TEXT NOT NULL,
    `read` BOOLEAN NOT NULL DEFAULT false,
    `dismissed` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_alert_manager_unread`(`manager_id`, `read`, `dismissed`),
    INDEX `idx_alert_manager_date`(`manager_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
