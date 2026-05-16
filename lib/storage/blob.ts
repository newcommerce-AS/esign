import { put, del } from "@vercel/blob";

export async function putPdf(key: string, body: Buffer): Promise<string> {
  const res = await put(key, body, { access: "public", contentType: "application/pdf", addRandomSuffix: false });
  return res.url;
}

export async function putBytes(key: string, body: Buffer, contentType: string): Promise<string> {
  const res = await put(key, body, { access: "public", contentType, addRandomSuffix: false });
  return res.url;
}

export async function deleteBlob(url: string): Promise<void> {
  await del(url);
}
