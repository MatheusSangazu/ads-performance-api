-- AlterTable
ALTER TABLE `managers` ADD COLUMN `phone` VARCHAR(20) NULL,
    ADD COLUMN `whatsapp_notify` BOOLEAN NOT NULL DEFAULT false;
