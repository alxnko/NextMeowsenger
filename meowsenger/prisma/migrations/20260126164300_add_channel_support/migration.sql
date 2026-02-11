-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "slug" TEXT;

-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE UNIQUE INDEX "Chat_slug_key" ON "Chat"("slug");
