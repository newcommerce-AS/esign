import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the db client before importing the module under test
vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
}));

import { rateLimit } from "@/lib/rate-limit/db";
import { db } from "@/lib/db/client";

const mockDb = db as {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rateLimit", () => {
  it("returns success true when under limit (count=0)", async () => {
    // Chain: db.select().from().where() → [{ count: 0 }]
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 0 }]),
      }),
    });
    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const r = await rateLimit("create:ip:1.2.3.4", { limit: 5, windowSec: 3600 });

    expect(r.success).toBe(true);
    expect(r.remaining).toBe(4);
  });

  it("returns success false when at limit (count=limit)", async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ count: 5 }]),
      }),
    });

    const r = await rateLimit("create:ip:1.2.3.4", { limit: 5, windowSec: 3600 });

    expect(r.success).toBe(false);
    expect(r.remaining).toBe(0);
    // insert should NOT be called when rate-limited
    expect(mockDb.insert).not.toHaveBeenCalled();
  });
});
