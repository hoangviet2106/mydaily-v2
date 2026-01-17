const prisma = require("./prisma");

async function main() {
  const result = await prisma.$queryRaw`SELECT NOW() as now;`;
  console.log("DB time:", result);
}

main()
  .catch((e) => console.error("DB error:", e))
  .finally(async () => {
    await prisma.$disconnect();
  });
