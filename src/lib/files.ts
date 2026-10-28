import "server-only";
import { createHash } from "node:crypto";

/* Enlaces temporales a Bunny CDN con «Token Authentication» (modo básico).
 * token = base64url(sha256(clave + ruta + caducidad)). La clave solo vive
 * en las variables de entorno de Netlify. */

const HOURS = 4;

export function signedFileUrl(storagePath: string, opts: { download?: string } = {}) {
  const host = process.env.BUNNY_CDN_HOST; // nombre de la Pull Zone (*.b-cdn.net)
  const key = process.env.BUNNY_TOKEN_KEY;
  if (!host || !key) return null;

  const path = "/" + storagePath.split("/").map(encodeURIComponent).join("/");
  const expires = Math.floor(Date.now() / 1000) + HOURS * 3600;
  const token = createHash("sha256")
    .update(key + path + expires)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const q = new URLSearchParams({ token, expires: String(expires) });
  if (opts.download) q.set("download", opts.download);
  return `https://${host}${path}?${q.toString()}`;
}

/* Vídeos de YouTube: se muestran desde youtube-nocookie.com. */
export function youtubeId(url: string | null | undefined) {
  if (!url) return null;
  const m =
    url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/) ??
    url.match(/[?&]v=([A-Za-z0-9_-]{6,})/) ??
    url.match(/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
