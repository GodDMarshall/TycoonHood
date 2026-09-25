import { prisma } from "@tycoonhood/db";
import { randomUUID } from "node:crypto";

/** Each test creates its own throwaway member — tests never share state. */
export async function createTestUser() {
  const id = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `test-${id}@tycoonhood.test`,
      name: `Test ${id}`,
      profile: {
        create: { username: `test_${id}`, displayName: `Test ${id}` },
      },
    },
  });
}

export const uid = () => randomUUID();
