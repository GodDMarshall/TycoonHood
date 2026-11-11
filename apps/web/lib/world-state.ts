/**
 * What the optional 3D campus at /world shows (DR-30), for one member, once
 * per request. The loader lives in core and is read-only: the member's own
 * figures plus house-wide counts, never another member (DR-22). This is the
 * only web import of it.
 */
import "server-only";
import { cache } from "react";
import { loadWorldState } from "@tycoonhood/core";

export const getWorldState = cache((userId: string) => loadWorldState(userId));
