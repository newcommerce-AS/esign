import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

let _redis: Redis | null = null;
const cache = new Map<string, Ratelimit>();

function devMode() {
  return !process.env.UPSTASH_REDIS_REST_URL;
}

function getRedis(): Redis {
  if (!_redis) _redis = Redis.fromEnv();
  return _redis;
}

export async function rateLimit(_key: string, opts: { limit: number; windowSec: number }) {
  if (devMode()) {
    return { success: true, remaining: opts.limit, reset: Date.now() + opts.windowSec * 1000 };
  }
  const cacheKey = `${opts.limit}:${opts.windowSec}`;
  let rl = cache.get(cacheKey);
  if (!rl) {
    rl = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(opts.limit, `${opts.windowSec}s`),
      analytics: false,
    });
    cache.set(cacheKey, rl);
  }
  return await rl.limit(_key);
}
