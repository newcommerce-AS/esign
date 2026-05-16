import { SignerView } from "./signer-view";

export default async function Page({ params }: { params: Promise<{ sign_token: string }> }) {
  const { sign_token } = await params;
  return <main className="max-w-3xl mx-auto p-6"><SignerView signToken={sign_token} /></main>;
}
