-- CreateTable
CREATE TABLE `tasks` (
    `id` CHAR(36) NOT NULL,
    `manager_id` CHAR(36) NOT NULL,
    `client_id` VARCHAR(50) NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,
    `status` ENUM('backlog', 'todo', 'in_progress', 'review', 'done') NOT NULL DEFAULT 'backlog',
    `priority` ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    `due_date` DATE NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `alert_id` CHAR(36) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_task_manager_status`(`manager_id`, `status`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE SET NULL ON UPDATE CASCADE;
