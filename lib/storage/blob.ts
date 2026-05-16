import { put, del } from "@vercel/blob";
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import path from "node:path";

const LOCAL_BLOB_DIR = path.join(process.cwd(), ".dev-blobs");

function devMode() {
  return !process.env.BLOB_READ_WRITE_TOKEN;
}

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function localUrl(key: string): string {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  // key may contain slashes (e.g. "<uuid>/final.pdf") — encode each segment
  const encodedPath = key.split("/").map(encodeURIComponent).join("/");
  return `${base}/dev-blob/${encodedPath}`;
}

function localFilePath(key: string): string {
  // Store using the natural path structure (key may contain slashes)
  return path.join(LOCAL_BLOB_DIR, ...key.split("/"));
}

export async function putPdf(key: string, body: Buffer): Promise<string> {
  if (devMode()) {
    const filePath = localFilePath(key);
    ensureDir(path.dirname(filePath));
    writeFileSync(filePath, body);
    return localUrl(key);
  }
  const res = await put(key, body, { access: "public", contentType: "application/pdf", addRandomSuffix: false });
  return res.url;
}

export async function putBytes(key: string, body: Buffer, contentType: string): Promise<string> {
  if (devMode()) {
    const filePath = localFilePath(key);
    ensureDir(path.dirname(filePath));
    writeFileSync(filePath, body);
    writeFileSync(filePath + ".content-type", contentType);
    return localUrl(key);
  }
  const res = await put(key, body, { access: "public", contentType, addRandomSuffix: false });
  return res.url;
}

export async function deleteBlob(url: string): Promise<void> {
  if (devMode()) {
    try {
      const u = new URL(url);
      const blobPath = u.pathname.replace(/^\/dev-blob\//, "");
      // Decode each segment and rebuild the file path
      const key = blobPath.split("/").map(decodeURIComponent).join("/");
      const filePath = localFilePath(key);
      if (existsSync(filePath)) unlinkSync(filePath);
      if (existsSync(filePath + ".content-type")) unlinkSync(filePath + ".content-type");
    } catch {
      // ignore errors during dev cleanup
    }
    return;
  }
  await del(url);
}
