-- CreateEnum
CREATE TYPE "InventorySiteMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "InventorySiteMediaSource" AS ENUM ('SITE_MEDIA', 'VENDOR_APPROVED', 'ADMIN_IMPORT', 'MANUAL');

-- AlterTable
ALTER TABLE "InventoryHoarding" ADD COLUMN "view360Url" TEXT;

-- CreateTable
CREATE TABLE "InventorySiteMedia" (
    "id" TEXT NOT NULL,
    "inventoryHoardingId" INTEGER NOT NULL,
    "type" "InventorySiteMediaType" NOT NULL,
    "source" "InventorySiteMediaSource" NOT NULL DEFAULT 'SITE_MEDIA',
    "key" TEXT NOT NULL,
    "url" TEXT,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "replacedAt" TIMESTAMP(3),
    "replacedById" INTEGER,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "InventorySiteMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventorySiteMedia_inventoryHoardingId_type_isActive_sortOrder_idx" ON "InventorySiteMedia"("inventoryHoardingId", "type", "isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "InventorySiteMedia_inventoryHoardingId_source_isActive_idx" ON "InventorySiteMedia"("inventoryHoardingId", "source", "isActive");

-- CreateIndex
CREATE INDEX "InventorySiteMedia_uploadedById_idx" ON "InventorySiteMedia"("uploadedById");

-- CreateIndex
CREATE INDEX "InventorySiteMedia_replacedById_idx" ON "InventorySiteMedia"("replacedById");

-- AddForeignKey
ALTER TABLE "InventorySiteMedia" ADD CONSTRAINT "InventorySiteMedia_inventoryHoardingId_fkey" FOREIGN KEY ("inventoryHoardingId") REFERENCES "InventoryHoarding"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySiteMedia" ADD CONSTRAINT "InventorySiteMedia_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventorySiteMedia" ADD CONSTRAINT "InventorySiteMedia_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
