import { describe, it, expect } from "vitest";
import { prisma } from "@tycoonhood/db";
import { DiscordService, DiscordAlreadyLinkedError, InvalidLinkCodeError } from "../src/integrations/discord";
import { createTestUser, uid } from "./helpers";

const discord = new DiscordService(prisma);

describe("Discord linking", () => {
  it("claims a valid code, binding the account; the code burns after use", async () => {
    const user = await createTestUser();
    const did = `d-${uid().slice(0, 10)}`;
    const { code } = await discord.createLinkCode(user.id);
    const link = await discord.claimLinkCode(code, did);
    expect(link.userId).toBe(user.id);
    expect(link.discordUserId).toBe(did);
    await expect(discord.claimLinkCode(code, `d-${uid().slice(0, 10)}`)).rejects.toBeInstanceOf(InvalidLinkCodeError);
  });

  it("rejects expired codes", async () => {
    const user = await createTestUser();
    const { code } = await discord.createLinkCode(user.id);
    await prisma.verificationToken.updateMany({
      where: { identifier: `discord:${user.id}` },
      data: { expires: new Date(Date.now() - 1000) },
    });
    await expect(discord.claimLinkCode(code, `d-${uid().slice(0,10)}`)).rejects.toBeInstanceOf(InvalidLinkCodeError);
  });

  it("relinking replaces the binding; sync without a bot reports honestly", async () => {
    const user = await createTestUser();
    const oldId = `d-${uid().slice(0, 10)}`;
    const newId = `d-${uid().slice(0, 10)}`;
    const c1 = await discord.createLinkCode(user.id);
    await discord.claimLinkCode(c1.code, oldId);
    const c2 = await discord.createLinkCode(user.id);
    await discord.claimLinkCode(c2.code, newId);
    const link = await discord.linkFor(user.id);
    expect(link?.discordUserId).toBe(newId);

    // The same Discord account cannot bind to a second member
    const rival = await createTestUser();
    const c3 = await discord.createLinkCode(rival.id);
    await expect(discord.claimLinkCode(c3.code, newId)).rejects.toBeInstanceOf(DiscordAlreadyLinkedError);

    const initiate = await prisma.rankDefinition.findUniqueOrThrow({ where: { slug: "initiate" } });
    await prisma.user.update({ where: { id: user.id }, data: { rankId: initiate.id } });
    const sync = await discord.syncRankRole(user.id);
    expect(sync.applied).toBe(false);
    expect(sync.transport).toBe("dev");
  });
});
