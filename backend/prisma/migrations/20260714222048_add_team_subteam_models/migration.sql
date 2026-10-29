-- CreateTable
CREATE TABLE "teams" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "sub_teams" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "leaderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sub_teams_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "_SubTeamMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_code_key" ON "teams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "teams_branchId_code_key" ON "teams"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "sub_teams_code_key" ON "sub_teams"("code");

-- CreateIndex
CREATE UNIQUE INDEX "sub_teams_branchId_code_key" ON "sub_teams"("branchId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "_SubTeamMembers_AB_unique" ON "_SubTeamMembers"("A", "B");

-- CreateIndex
CREATE INDEX "_SubTeamMembers_B_index" ON "_SubTeamMembers"("B");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_teams" ADD CONSTRAINT "sub_teams_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_teams" ADD CONSTRAINT "sub_teams_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sub_teams" ADD CONSTRAINT "sub_teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "users"("_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubTeamMembers" ADD CONSTRAINT "_SubTeamMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "sub_teams"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SubTeamMembers" ADD CONSTRAINT "_SubTeamMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
