/*
  Warnings:

  - Added the required column `updated_at` to the `tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `completed_at` DATETIME(0) NULL,
    ADD COLUMN `updated_at` DATETIME(0) NOT NULL;

-- CreateTable
CREATE TABLE `user_streaks` (
    `user_id` CHAR(36) NOT NULL,
    `current_streak` INTEGER NOT NULL DEFAULT 0,
    `longest_streak` INTEGER NOT NULL DEFAULT 0,
    `last_streak_date` DATE NULL,
    `updated_at` DATETIME(0) NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `tasks_user_id_is_completed_idx` ON `tasks`(`user_id`, `is_completed`);

-- CreateIndex
CREATE INDEX `tasks_user_id_completed_at_idx` ON `tasks`(`user_id`, `completed_at`);

-- AddForeignKey
ALTER TABLE `user_streaks` ADD CONSTRAINT `user_streaks_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
