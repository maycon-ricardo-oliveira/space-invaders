-- CreateTable
CREATE TABLE "World" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "image" TEXT,
    "parallaxTheme" TEXT DEFAULT 'space',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "World_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Phase" (
    "id" SERIAL NOT NULL,
    "worldId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Phase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" SERIAL NOT NULL,
    "phaseId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "enemySpeed" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "shotDelay" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "fuelDrain" DOUBLE PRECISION NOT NULL DEFAULT 8.0,
    "enemyShotSpeed" DOUBLE PRECISION NOT NULL DEFAULT 4.0,
    "enemyAngerDelay" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "enemySpawnDelay" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "hasPowerUps" BOOLEAN NOT NULL DEFAULT true,
    "parallaxTheme" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wave" (
    "id" SERIAL NOT NULL,
    "levelId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "delay" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "grid" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wave_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pattern" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "grid" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pattern_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "World_index_key" ON "World"("index");

-- CreateIndex
CREATE UNIQUE INDEX "Phase_worldId_index_key" ON "Phase"("worldId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Level_phaseId_index_key" ON "Level"("phaseId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Wave_levelId_order_key" ON "Wave"("levelId", "order");

-- AddForeignKey
ALTER TABLE "Phase" ADD CONSTRAINT "Phase_worldId_fkey" FOREIGN KEY ("worldId") REFERENCES "World"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Level" ADD CONSTRAINT "Level_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "Phase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wave" ADD CONSTRAINT "Wave_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE CASCADE ON UPDATE CASCADE;
