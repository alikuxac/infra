import { Env as Env } from "../../env.js";

export class AuthService {
  static isAuthorized(userId: string, platform: string, env: Env): boolean {
    const allowed = platform === "discord"
      ? env.ALLOWED_DISCORD_IDS
      : env.ALLOWED_TELEGRAM_IDS;

    if (!allowed || allowed === "*") return true;
    return allowed.split(",").includes(userId);
  }
}
