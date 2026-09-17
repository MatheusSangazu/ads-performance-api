-- CreateTable
CREATE TABLE `client_summary_schedules` (
    `id` CHAR(36) NOT NULL,
    `manager_id` CHAR(36) NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `frequency` ENUM('daily', 'weekly', 'monthly') NOT NULL,
    `send_time` CHAR(5) NOT NULL,
    `week_day` INTEGER NULL,
    `month_day` INTEGER NULL,
    `period` ENUM('yesterday', 'previous_week', 'previous_month', 'month_to_date', 'last_7_days') NOT NULL,
    `destination_type` ENUM('phone', 'group') NOT NULL,
    `destination` VARCHAR(160) NOT NULL,
    `template` TEXT NOT NULL,
    `next_run_at` DATETIME(0) NOT NULL,
    `last_sent_at` DATETIME(0) NULL,
    `last_attempt_at` DATETIME(0) NULL,
    `last_error` TEXT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` DATETIME(0) NOT NULL,

    INDEX `client_summary_schedules_manager_id_client_id_idx`(`manager_id`, `client_id`),
    INDEX `client_summary_schedules_enabled_next_run_at_idx`(`enabled`, `next_run_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_summary_schedules`
    ADD CONSTRAINT `client_summary_schedules_manager_id_fkey`
    FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_summary_schedules`
    ADD CONSTRAINT `client_summary_schedules_client_id_fkey`
    FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE CASCADE ON UPDATE CASCADE;
