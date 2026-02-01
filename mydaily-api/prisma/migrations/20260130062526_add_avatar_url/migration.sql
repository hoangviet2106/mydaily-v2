/*
  Warnings:

  - A unique constraint covering the columns `[user_id,name]` on the table `category` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `users` ADD COLUMN `avatar_url` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `category_user_id_idx` ON `category`(`user_id`);

-- CreateIndex
CREATE INDEX `category_user_id_deleted_at_idx` ON `category`(`user_id`, `deleted_at`);

-- CreateIndex
CREATE UNIQUE INDEX `category_user_id_name_key` ON `category`(`user_id`, `name`);
