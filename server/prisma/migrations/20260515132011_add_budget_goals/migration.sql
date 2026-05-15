-- CreateTable
CREATE TABLE `client_budgets` (
    `id` CHAR(36) NOT NULL,
    `manager_id` CHAR(36) NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `month` DATE NOT NULL,
    `budget_amount` DECIMAL(15, 4) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `client_budgets_manager_id_client_id_month_key`(`manager_id`, `client_id`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `client_goals` (
    `id` CHAR(36) NOT NULL,
    `manager_id` CHAR(36) NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `metric` ENUM('leads', 'cpl', 'roas', 'ctr', 'clicks', 'impressions', 'purchases', 'purchase_value') NOT NULL,
    `target_value` DECIMAL(15, 4) NOT NULL,
    `month` DATE NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `client_goals_manager_id_client_id_metric_month_key`(`manager_id`, `client_id`, `metric`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `client_budgets` ADD CONSTRAINT `client_budgets_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_budgets` ADD CONSTRAINT `client_budgets_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_goals` ADD CONSTRAINT `client_goals_manager_id_fkey` FOREIGN KEY (`manager_id`) REFERENCES `managers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `client_goals` ADD CONSTRAINT `client_goals_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
