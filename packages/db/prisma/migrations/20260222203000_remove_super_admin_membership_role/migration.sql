ALTER TABLE "memberships" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "invitations" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "memberships" ALTER COLUMN "role" TYPE TEXT;
ALTER TABLE "invitations" ALTER COLUMN "role" TYPE TEXT;

UPDATE "memberships" SET "role" = 'admin' WHERE "role" = 'super_admin';
UPDATE "invitations" SET "role" = 'admin' WHERE "role" = 'super_admin';

ALTER TYPE "MembershipRole" RENAME TO "MembershipRole_old";
CREATE TYPE "MembershipRole" AS ENUM ('owner', 'admin', 'member');

ALTER TABLE "memberships"
  ALTER COLUMN "role" TYPE "MembershipRole"
  USING ("role"::"MembershipRole");

ALTER TABLE "invitations"
  ALTER COLUMN "role" TYPE "MembershipRole"
  USING ("role"::"MembershipRole");

ALTER TABLE "memberships" ALTER COLUMN "role" SET DEFAULT 'member';
ALTER TABLE "invitations" ALTER COLUMN "role" SET DEFAULT 'member';

DROP TYPE "MembershipRole_old";
