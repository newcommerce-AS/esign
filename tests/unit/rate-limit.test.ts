import { describe, it, expect, vi, beforeEach } from "vitest";
import { rateLimit } from "@/lib/rate-limit/upstash";

vi.mock("@upstash/redis", () => ({ Redis: class { static fromEnv() { return new this(); } } }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    constructor() {}
    async limit() { return { success: true, remaining: 4, reset: Date.now() + 1000 }; }
  },
}));

beforeEach(() => process.env.UPSTASH_REDIS_REST_URL = "x");

describe("rateLimit", () => {
  it("returns success true for unblocked key", async () => {
    const r = await rateLimit("create:ip:1.2.3.4", { limit: 5, windowSec: 3600 });
    expect(r.success).toBe(true);
  });
});
