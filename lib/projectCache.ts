import { PlanId } from "./pricing";

type MeResponse = {
  authed: boolean;
  email: string;
  plan: PlanId;
};

type CacheShape = { projects: any[]; me: MeResponse; fetchedAt: number };

let cache: CacheShape | null = null;
const STALE_MS = 60_000; // tune as needed

export function getCache(): CacheShape | null {
  return cache;
}

export function setCache(data: { projects: any[]; me: MeResponse }) {
  cache = { ...data, fetchedAt: Date.now() };
}

export function isStale(): boolean {
  return !cache || Date.now() - cache.fetchedAt > STALE_MS;
}

export function invalidateCache() {
  cache = null;
}
