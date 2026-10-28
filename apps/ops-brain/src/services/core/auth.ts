import { Env as Env } from "../../env.js";

export class AuthService {
  static isAuthorized(userId: string, platform: string, env: Env): boolean {
    const allowed = platform === "discord"
      ? env.ALLOWED_DISCORD_IDS
      : env.ALLOWED_TELEGRAM_IDS;

    if (!userId) return false;
    if (!allowed || allowed.trim() === "") return false;
    if (allowed.trim() === "*") return true;

    return allowed.split(",").map(id => id.trim()).filter(Boolean).includes(userId);
  }

  static async tokenMatches(presented: string | null | undefined, expected: string | undefined): Promise<boolean> {
    if (!presented || !expected) return false;

    const encoder = new TextEncoder();
    const a = encoder.encode(presented);
    const b = encoder.encode(expected);
    if (a.byteLength !== b.byteLength) return false;

    return crypto.subtle.timingSafeEqual(a, b);
  }

  static bearer(header: string | null | undefined): string | null {
    if (!header) return null;
    const prefix = "Bearer ";
    return header.startsWith(prefix) ? header.slice(prefix.length) : null;
  }
}