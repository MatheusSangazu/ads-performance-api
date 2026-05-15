-- CreateTable
CREATE TABLE `clients_config` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `client_name` VARCHAR(100) NOT NULL,
    `act_id` VARCHAR(50) NOT NULL,
    `access_token` TEXT NOT NULL,
    `custom_event_id` VARCHAR(100) NULL,
    `is_ecommerce` BOOLEAN NULL DEFAULT false,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `clients_config_act_id_key`(`act_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `meta_ads_performance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `ad_id` VARCHAR(50) NOT NULL,
    `ad_name` VARCHAR(255) NULL,
    `campaign_name` VARCHAR(255) NULL,
    `campaign_id` VARCHAR(50) NULL,
    `reach` INTEGER NULL DEFAULT 0,
    `impressions` INTEGER NULL DEFAULT 0,
    `spend` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `link_clicks` INTEGER NULL DEFAULT 0,
    `ctr` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `messaging_conversations` INTEGER NULL DEFAULT 0,
    `leads` INTEGER NULL DEFAULT 0,
    `leads_form` INTEGER NULL DEFAULT 0,
    `page_views` INTEGER NULL DEFAULT 0,
    `add_to_cart` INTEGER NULL DEFAULT 0,
    `initiate_checkout` INTEGER NULL DEFAULT 0,
    `purchases` INTEGER NULL DEFAULT 0,
    `purchase_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `custom_conversion_count` INTEGER NULL DEFAULT 0,
    `custom_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `preview_link` TEXT NULL,
    `ad_status` VARCHAR(50) NULL,
    `campaign_status` VARCHAR(50) NULL,
    `total_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `roas` DECIMAL(10, 4) NULL DEFAULT 0.0000,

    INDEX `idx_client`(`client_id`),
    INDEX `idx_date`(`date`),
    UNIQUE INDEX `unique_ad_date`(`date`, `ad_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_audience_performance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `ad_id` VARCHAR(50) NOT NULL,
    `ad_name` VARCHAR(255) NULL,
    `campaign_name` VARCHAR(255) NULL,
    `campaign_id` VARCHAR(50) NULL,
    `gender` VARCHAR(20) NOT NULL,
    `age_range` VARCHAR(10) NOT NULL,
    `reach` INTEGER NULL DEFAULT 0,
    `impressions` INTEGER NULL DEFAULT 0,
    `spend` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `link_clicks` INTEGER NULL DEFAULT 0,
    `ctr` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `messaging_conversations` INTEGER NULL DEFAULT 0,
    `leads` INTEGER NULL DEFAULT 0,
    `leads_form` INTEGER NULL DEFAULT 0,
    `page_views` INTEGER NULL DEFAULT 0,
    `add_to_cart` INTEGER NULL DEFAULT 0,
    `initiate_checkout` INTEGER NULL DEFAULT 0,
    `purchases` INTEGER NULL DEFAULT 0,
    `purchase_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `custom_conversion_count` INTEGER NULL DEFAULT 0,
    `custom_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `roas` DECIMAL(10, 4) NULL DEFAULT 0.0000,

    INDEX `idx_audience_client`(`client_id`),
    INDEX `idx_audience_date`(`date`),
    UNIQUE INDEX `unique_audience_ad_date`(`date`, `ad_id`, `gender`, `age_range`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_placement_performance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `ad_id` VARCHAR(50) NOT NULL,
    `ad_name` VARCHAR(255) NULL,
    `campaign_name` VARCHAR(255) NULL,
    `campaign_id` VARCHAR(50) NULL,
    `platform` VARCHAR(50) NOT NULL,
    `reach` INTEGER NULL DEFAULT 0,
    `impressions` INTEGER NULL DEFAULT 0,
    `spend` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `link_clicks` INTEGER NULL DEFAULT 0,
    `ctr` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `messaging_conversations` INTEGER NULL DEFAULT 0,
    `leads` INTEGER NULL DEFAULT 0,
    `leads_form` INTEGER NULL DEFAULT 0,
    `page_views` INTEGER NULL DEFAULT 0,
    `add_to_cart` INTEGER NULL DEFAULT 0,
    `initiate_checkout` INTEGER NULL DEFAULT 0,
    `purchases` INTEGER NULL DEFAULT 0,
    `purchase_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `custom_conversion_count` INTEGER NULL DEFAULT 0,
    `custom_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `roas` DECIMAL(10, 4) NULL DEFAULT 0.0000,

    INDEX `idx_placement_client`(`client_id`),
    INDEX `idx_placement_date`(`date`),
    UNIQUE INDEX `unique_placement_ad_date`(`date`, `ad_id`, `platform`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ad_region_performance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `date` DATE NOT NULL,
    `client_id` VARCHAR(50) NOT NULL,
    `ad_id` VARCHAR(50) NOT NULL,
    `ad_name` VARCHAR(255) NULL,
    `campaign_name` VARCHAR(255) NULL,
    `campaign_id` VARCHAR(50) NULL,
    `region` VARCHAR(100) NOT NULL,
    `reach` INTEGER NULL DEFAULT 0,
    `impressions` INTEGER NULL DEFAULT 0,
    `spend` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `link_clicks` INTEGER NULL DEFAULT 0,
    `ctr` DECIMAL(10, 4) NULL DEFAULT 0.0000,
    `messaging_conversations` INTEGER NULL DEFAULT 0,
    `leads` INTEGER NULL DEFAULT 0,
    `leads_form` INTEGER NULL DEFAULT 0,
    `page_views` INTEGER NULL DEFAULT 0,
    `add_to_cart` INTEGER NULL DEFAULT 0,
    `initiate_checkout` INTEGER NULL DEFAULT 0,
    `purchases` INTEGER NULL DEFAULT 0,
    `purchase_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `custom_conversion_count` INTEGER NULL DEFAULT 0,
    `custom_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `total_conversion_value` DECIMAL(15, 4) NULL DEFAULT 0.0000,
    `roas` DECIMAL(10, 4) NULL DEFAULT 0.0000,

    INDEX `idx_region_client`(`client_id`),
    INDEX `idx_region_date`(`date`),
    UNIQUE INDEX `unique_region_ad_date`(`date`, `ad_id`, `region`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `app_settings` (
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `meta_ads_performance` ADD CONSTRAINT `meta_ads_performance_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_audience_performance` ADD CONSTRAINT `ad_audience_performance_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_placement_performance` ADD CONSTRAINT `ad_placement_performance_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ad_region_performance` ADD CONSTRAINT `ad_region_performance_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `clients_config`(`act_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
