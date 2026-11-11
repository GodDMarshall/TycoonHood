/**
 * What the optional 3D campus at /world shows (DR-31), for one member, once
 * per request. The loader lives in core and is read-only: the member's own
 * figures plus house-wide counts, never another member (DR-22). This is the
 * only web import of it. The unread total is the sidebar's, read once.
 */
import "server-only";
import { cache } from "react";
import { loadWorldState } from "@tycoonhood/core";
import type { UserRole } from "@tycoonhood/db";
import { unreadCommunity } from "./unread";

export const getWorldState = cache(async (userId: string, role: UserRole, joinedMs: number) =>
  loadWorldState(userId, { unread: await unreadCommunity(userId, role, joinedMs) })
);
