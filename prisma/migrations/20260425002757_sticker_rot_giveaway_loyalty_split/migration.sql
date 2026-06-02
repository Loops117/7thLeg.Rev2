-- CreateEnum
CREATE TYPE "EventGiveawayRole" AS ENUM ('PRIMARY', 'BACKUP');

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "giveawayBackupCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "giveawayEmailBody" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "giveawayEmailSubject" TEXT NOT NULL DEFAULT 'Congratulations — you won!',
ADD COLUMN     "giveawayPrimaryCount" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "giveawaySendEmailOnDraw" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "site_config" ADD COLUMN     "bg_sticker_rot_max_deg" INTEGER NOT NULL DEFAULT 45,
ADD COLUMN     "bg_sticker_rot_min_deg" INTEGER NOT NULL DEFAULT -45;

-- CreateTable
CREATE TABLE "event_giveaway_winners" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventEntryId" TEXT NOT NULL,
    "role" "EventGiveawayRole" NOT NULL,
    "position" INTEGER NOT NULL,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_giveaway_winners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "event_giveaway_winners_eventId_role_position_idx" ON "event_giveaway_winners"("eventId", "role", "position");

-- AddForeignKey
ALTER TABLE "event_giveaway_winners" ADD CONSTRAINT "event_giveaway_winners_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_giveaway_winners" ADD CONSTRAINT "event_giveaway_winners_eventEntryId_fkey" FOREIGN KEY ("eventEntryId") REFERENCES "event_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
