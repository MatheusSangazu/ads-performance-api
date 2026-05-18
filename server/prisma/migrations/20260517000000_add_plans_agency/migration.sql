-- AlterEnum
ALTER TABLE `managers` MODIFY COLUMN `role` ENUM('admin', 'manager', 'agency') NOT NULL DEFAULT 'manager';

-- CreateTable (enum assist)
-- MySQL doesn't support CREATE TYPE, so we use a VARCHAR for subscription_status

-- AlterTable
ALTER TABLE `managers`
    ADD COLUMN `agency_id` CHAR(36) NULL,
    ADD COLUMN `max_seats` INTEGER NULL,
    ADD COLUMN `subscription_status` ENUM('active', 'past_due', 'canceled', 'trial') NOT NULL DEFAULT 'active',
    ADD COLUMN `subscription_ends_at` TIMESTAMP(0) NULL,
    ADD COLUMN `billing_period` VARCHAR(20) NULL;

-- AddForeignKey
ALTER TABLE `managers`
    ADD CONSTRAINT `managers_agency_id_fkey` FOREIGN KEY (`agency_id`) REFERENCES `managers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `idx_managers_agency_id` ON `managers`(`agency_id`);

-- Baseline: mark drifted columns so Prisma stops complaining
-- These columns already exist in the database but were added outside migrations
