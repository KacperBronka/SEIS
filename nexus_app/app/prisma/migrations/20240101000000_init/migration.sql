CREATE TABLE "User" (
    "id"           SERIAL NOT NULL,
    "nick"         TEXT NOT NULL,
    "email"        TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ageVerified"  BOOLEAN NOT NULL DEFAULT false,
    "seisToken"    TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_nick_key" ON "User"("nick");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
