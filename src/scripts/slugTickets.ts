import prisma from "../db/db";
async function main() {
  const startBase = 100000;
  const range = 100000;
  const rows = 5;

  for (let i = 0; i < rows; i++) {
    const range_start = startBase + i * range;
    const range_end = range_start + range;
    const current_value = range_start;

    await prisma.slugTicket.create({
      data: {
        range_start,
        range_end,
        current_value,
      },
    });

    console.log(
      `inserted ${range_start} to ${range_end}, current = ${current_value}`,
    );
  }
}

main()
  .then(() => {
    console.log("seeding successful");
    return prisma.$disconnect();
  })
  .catch((err) => {
    console.error("error while seeding tickets", err);
    return prisma.$disconnect();
  });
