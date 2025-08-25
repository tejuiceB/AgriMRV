-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plot" (
    "id" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "boundaryGeojson" JSONB NOT NULL,
    "agroEcozone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tree" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "speciesCode" TEXT,
    "heightM" DOUBLE PRECISION,
    "crownAreaM2" DOUBLE PRECISION,
    "dbhCm" DOUBLE PRECISION,
    "health" TEXT,
    "sourceRunId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tree_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
    "id" TEXT NOT NULL,
    "plotId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "paramsHash" TEXT NOT NULL,
    "outputsUri" TEXT,
    "ci95Low" DOUBLE PRECISION,
    "ci95High" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BiomassSummary" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agbTHa" DOUBLE PRECISION,
    "bgbTHa" DOUBLE PRECISION,
    "carbonTHa" DOUBLE PRECISION,
    "uncPct" DOUBLE PRECISION,

    CONSTRAINT "BiomassSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MRVPackage" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "artifactsUri" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "ledgerTxId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MRVPackage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BiomassSummary_runId_key" ON "BiomassSummary"("runId");

-- CreateIndex
CREATE UNIQUE INDEX "MRVPackage_runId_key" ON "MRVPackage"("runId");

-- AddForeignKey
ALTER TABLE "Tree" ADD CONSTRAINT "Tree_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Run" ADD CONSTRAINT "Run_plotId_fkey" FOREIGN KEY ("plotId") REFERENCES "Plot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiomassSummary" ADD CONSTRAINT "BiomassSummary_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MRVPackage" ADD CONSTRAINT "MRVPackage_runId_fkey" FOREIGN KEY ("runId") REFERENCES "Run"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
