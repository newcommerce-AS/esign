// Pure helper: find the signer that corresponds to the sender, if any.
// The sender is "also a signer" purely by email match — there is no DB link.
// Used to decide where to redirect the sender after they confirm: to their own
// signing page (match) or to the status page (no match).
const SIGNED_OR_DECLINED = new Set(["signed", "declined"]);

export function matchSenderSigner<T extends { email: string; status: string }>(
  senderEmail: string,
  signers: T[],
): T | null {
  const target = senderEmail.trim().toLowerCase();
  return signers.find(
    (s) => s.email.trim().toLowerCase() === target && !SIGNED_OR_DECLINED.has(s.status),
  ) ?? null;
}
