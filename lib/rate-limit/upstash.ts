import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let redis: Redis | undefined;
const cache = new Map<string, Ratelimit>();

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

export async function rateLimit(key: string, opts: { limit: number; windowSec: number }) {
  const cacheKey = `${opts.limit}:${opts.windowSec}`;
  let rl = cache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({ redis: getRedis(), limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowSec}s`), analytics: false });
    cache.set(cacheKey, rl);
  }
  return await rl.limit(key);
}
