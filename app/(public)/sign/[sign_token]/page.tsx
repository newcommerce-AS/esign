import { SignerView } from "./signer-view";

export default async function Page({ params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  // SignerView manages its own full-screen layout (no nav/footer — this is a standalone signing experience)
  return <SignerView signToken={sign_token} />;
}
