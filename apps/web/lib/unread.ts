/**
 * The member's unread total across their channels, worked out once per
 * request: the sidebar's badge and the 3D campus both show it. Plain
 * arguments, because cache() matches its arguments by identity.
 */
import "server-only";
import { cache } from "react";
import { community } from "@tycoonhood/core";
import type { UserRole } from "@tycoonhood/db";

export const unreadCommunity = cache((userId: string, role: UserRole, joinedMs: number) =>
  community.unreadTotal({ id: userId, role }, new Date(joinedMs))
);
