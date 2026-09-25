import { afterAll, describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { CommerceService, OutOfStockError } from "../src/commerce/commerce";
import { LedgerService, InsufficientFundsError } from "../src/ledger/ledger";
import { createTestUser, uid } from "./helpers";

const commerce = new CommerceService(prisma);
const ledger = new LedgerService(prisma);

async function fund(userId: string, amount: bigint) {
  await ledger.reward({ userId, amount, reason: "REWARD_ADMIN", idempotencyKey: `fund-${uid()}` });
}

afterAll(async () => {
  await prisma.product.updateMany({ where: { slug: { startsWith: "scarce-" } }, data: { active: false } });
});

describe("Commerce — THC checkout", () => {
  it("buys the course product: ledger spend linked, REVENUE credited, enrollment granted, order FULFILLED", async () => {
    const user = await createTestUser();
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "warrior-program-access" } });
    await fund(user.id, product.priceThc! + 10n);
    const revenueBefore = (await ledger.systemAccount("REVENUE")).balance;

    const order = await commerce.checkoutWithThc(user.id, product.slug);
    expect(order.status).toBe("FULFILLED");
    expect(order.ledgerTxId).not.toBeNull();

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(10n);
    expect((await ledger.systemAccount("REVENUE")).balance - revenueBefore).toBe(product.priceThc!);

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, course: { slug: "warrior" } },
    });
    expect(enrollment).not.toBeNull();

    const tx = await prisma.ledgerTransaction.findUniqueOrThrow({ where: { id: order.ledgerTxId! } });
    expect(tx.sourceId).toBe(order.id);
  });

  it("insufficient THC cancels the order, restores inventory, moves nothing", async () => {
    const user = await createTestUser();
    const before = await prisma.product.findUniqueOrThrow({ where: { slug: "tycoonhood-training-tee" } });
    // Tee has no THC price → use playbook with an empty wallet instead
    const playbook = await prisma.product.findUniqueOrThrow({ where: { slug: "founders-playbook" } });
    await expect(commerce.checkoutWithThc(user.id, playbook.slug)).rejects.toBeInstanceOf(InsufficientFundsError);

    const wallet = await ledger.ensureUserAccount(user.id);
    expect(await ledger.getBalance(wallet.id)).toBe(0n);
    const cancelled = await prisma.order.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    expect(cancelled?.status).toBe("CANCELLED");
    // Unlimited digital inventory untouched by definition; tee untouched entirely
    const teeAfter = await prisma.product.findUniqueOrThrow({ where: { slug: "tycoonhood-training-tee" } });
    expect(teeAfter.inventory).toBe(before.inventory);
  });

  it("inventory exhaustion throws OutOfStock and restores on later failures", async () => {
    const scarce = await prisma.product.create({
      data: {
        slug: `scarce-${uid().slice(0, 8)}`,
        kind: "DIGITAL",
        name: "Scarce Item",
        description: "test",
        active: true,
        priceThc: 100n,
        inventory: 1,
      },
    });
    const rich = await createTestUser();
    const poor = await createTestUser();
    await fund(rich.id, 200n);

    await commerce.checkoutWithThc(rich.id, scarce.slug);
    await expect(commerce.checkoutWithThc(poor.id, scarce.slug)).rejects.toBeInstanceOf(OutOfStockError);

    const after = await prisma.product.findUniqueOrThrow({ where: { id: scarce.id } });
    expect(after.inventory).toBe(0);
  });
});

/** Physical goods now require somewhere to be sent, as they always should have. */
const TEST_ADDRESS = {
  fullName: "A Member",
  line1: "1 Test Street",
  city: "Mysore",
  postalCode: "570001",
  country: "IN",
};

describe("Commerce — fiat settlement path", () => {
  it("settleFiatOrder fulfills once and is idempotent", async () => {
    const user = await createTestUser();
    const order = await commerce.createFiatOrder(user.id, "tycoonhood-training-tee", "test", { shipping: TEST_ADDRESS });
    expect(order.status).toBe("PENDING");

    const settled = await commerce.settleFiatOrder(order.id, "test_ref_1");
    expect(settled.status).toBe("PAID"); // physical stays PAID until shipped
    const again = await commerce.settleFiatOrder(order.id, "test_ref_2");
    expect(again.paymentRef).toBe("test_ref_1"); // no re-settle

    const note = await prisma.notification.count({ where: { userId: user.id, type: "ORDER" } });
    expect(note).toBe(1);
  });

  it("cancelFiatOrder restores physical inventory", async () => {
    const user = await createTestUser();
    const before = (await prisma.product.findUniqueOrThrow({ where: { slug: "tycoonhood-training-tee" } })).inventory!;
    const order = await commerce.createFiatOrder(user.id, "tycoonhood-training-tee", "test", { shipping: TEST_ADDRESS });
    const during = (await prisma.product.findUniqueOrThrow({ where: { slug: "tycoonhood-training-tee" } })).inventory!;
    expect(during).toBe(before - 1);
    await commerce.cancelFiatOrder(order.id);
    const after = (await prisma.product.findUniqueOrThrow({ where: { slug: "tycoonhood-training-tee" } })).inventory!;
    expect(after).toBe(before);
  });
});
