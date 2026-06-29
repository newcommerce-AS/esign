import { describe, it, expect } from "vitest";
import { matchSenderSigner } from "@/lib/services/match-sender-signer";

type S = { email: string; status: string; signToken: string };

const mk = (email: string, status: string, signToken: string): S => ({ email, status, signToken });

describe("matchSenderSigner", () => {
  it("matches a signer by case-insensitive, trimmed email", () => {
    const signers = [mk("a@x.no", "pending", "t-a"), mk("Ole@Firma.NO", "pending", "t-ole")];
    expect(matchSenderSigner("  ole@firma.no ", signers)?.signToken).toBe("t-ole");
  });

  it("returns null when no signer email matches the sender", () => {
    const signers = [mk("a@x.no", "pending", "t-a")];
    expect(matchSenderSigner("nobody@x.no", signers)).toBeNull();
  });

  it("skips signers who have already signed or declined", () => {
    const signers = [mk("ole@x.no", "signed", "t-signed"), mk("ole@x.no", "declined", "t-declined")];
    expect(matchSenderSigner("ole@x.no", signers)).toBeNull();
  });

  it("returns the first not-yet-signed match when several share the sender email", () => {
    const signers = [
      mk("ole@x.no", "signed", "t-signed"),
      mk("ole@x.no", "pending", "t-pending"),
      mk("ole@x.no", "email_verified", "t-verified"),
    ];
    expect(matchSenderSigner("ole@x.no", signers)?.signToken).toBe("t-pending");
  });

  it("returns null for an empty signer list", () => {
    expect(matchSenderSigner("ole@x.no", [])).toBeNull();
  });
});
