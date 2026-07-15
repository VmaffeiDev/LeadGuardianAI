-- CreateEnum
CREATE TYPE "LeadTemperature" AS ENUM ('QUENTE', 'MORNO', 'FRIO');

-- CreateEnum
CREATE TYPE "WhatsappDirection" AS ENUM ('OUT', 'IN');

-- AlterEnum
ALTER TYPE "LeadEventType" ADD VALUE 'WHATSAPP';

-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'EM_TRIAGEM';

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "carInterest" TEXT,
ADD COLUMN     "temperature" "LeadTemperature",
ADD COLUMN     "triageStartedAt" TIMESTAMP(3),
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "whatsappOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "whatsappPhoneNumberId" TEXT,
ADD COLUMN     "whatsappTemplateName" TEXT;

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "direction" "WhatsappDirection" NOT NULL,
    "body" TEXT NOT NULL,
    "waMessageId" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "whatsapp_messages_leadId_createdAt_idx" ON "whatsapp_messages"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "whatsapp_messages_tenantId_waMessageId_idx" ON "whatsapp_messages"("tenantId", "waMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_whatsappPhoneNumberId_key" ON "tenants"("whatsappPhoneNumberId");

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

