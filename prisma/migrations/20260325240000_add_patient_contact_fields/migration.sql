-- AlterTable: Add contact/insurance/notes fields to Patient
ALTER TABLE "Patient" ADD COLUMN "phone" TEXT;
ALTER TABLE "Patient" ADD COLUMN "email" TEXT;
ALTER TABLE "Patient" ADD COLUMN "insuranceId" TEXT;
ALTER TABLE "Patient" ADD COLUMN "notes" TEXT;
