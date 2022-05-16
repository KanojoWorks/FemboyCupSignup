-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL,
    "discordId" BIGINT NOT NULL,
    "username" TEXT NOT NULL,
    "discordUsername" TEXT NOT NULL,
    "signupDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "osuSignupDate" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "bwsRank" INTEGER NOT NULL,
    "badges" INTEGER NOT NULL,
    "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
    "failedScreening" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_discordId_key" ON "Player"("discordId");
