-- AlterTable
ALTER TABLE "equipos" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "snmpCommunity" TEXT DEFAULT 'public',
ADD COLUMN     "snmpPort" INTEGER DEFAULT 161;
