// prisma/backfill.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The same helper logic from your actions file
function getParentEmail(email: string): string {
  if (!email.includes("@")) return email;
  
  const [localPart, domain] = email.split("@");
  
  // 1. Remove everything after a plus sign
  const noPlus = localPart.split("+")[0];
  
  // 2. Remove all dots
  const noDots = noPlus.replace(/\./g, "");
  
  return `${noDots}@${domain}`.toLowerCase();
}

async function main() {
  console.log("🔄 Starting backfill of parent emails...");

  // 1. Fetch all records that are missing a parentEmail
  // (Or fetch ALL records just to be safe and ensure consistency)
  const allEmails = await prisma.usedEmail.findMany();

  console.log(`Found ${allEmails.length} emails to check.`);

  let updatedCount = 0;

  // 2. Loop through and update them one by one
  for (const record of allEmails) {
    const calculatedParent = getParentEmail(record.email);

    // Only update if it's missing or different
    if (record.parentEmail !== calculatedParent) {
      await prisma.usedEmail.update({
        where: { id: record.id },
        data: { parentEmail: calculatedParent },
      });
      console.log(`✅ Fixed: ${record.email} -> ${calculatedParent}`);
      updatedCount++;
    }
  }

  console.log(`\n🎉 Done! Updated ${updatedCount} records.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });