import prisma from "../db/db";
import { encodeBase62 } from "./base62";

export const generateSlug = async (id: number): Promise<void> => {
  try {
    const [partition] = await prisma.$queryRaw<
      {
        id: number;
        range_start: number;
        range_end: number;
        current_value: number;
      }[]
    >`
      SELECT * FROM "SlugTicket"
      WHERE "current_value" < "range_end"
      ORDER BY RANDOM()
      LIMIT 1
    `;

    if (!partition) {
      console.error("No available keys");
      return;
    }

    const updated = await prisma.slugTicket.update({
      where: { id: partition.id },
      data: { current_value: { increment: 1 } },
    });

    const ticketNumber = updated.current_value - 1;
    const shortCode = encodeBase62(ticketNumber);

    await prisma.monitor.update({
      where: {
        id: id,
      },
      data: {
        slug: shortCode,
      },
    });

    console.log(`Generated short URL: ${shortCode}`);
  } catch (error) {
    console.error("Background short URL generation failed:", error);
  }
};
