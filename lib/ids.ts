import crypto from "node:crypto";

export function randomToken(len = 10) {
  return crypto.randomBytes(16).toString("base64url").replace(/[-_]/g, "").slice(0, len).toLowerCase();
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 40);
}
