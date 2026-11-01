import { describe, it, expect } from "vitest";
import {
  constantTimeEquals,
  extractPresentedKey,
  isRequestAuthorized,
  unauthorizedResponse
} from "../src/auth.js";
import { Env } from "../src/types.js";

describe("auth module", () => {
  describe("constantTimeEquals", () => {
    it("should return true for identical strings", async () => {
      const match = await constantTimeEquals("super-secret-key-123", "super-secret-key-123");
      expect(match).toBe(true);
    });

    it("should return false for different strings with same length", async () => {
      const match = await constantTimeEquals("super-secret-key-123", "super-secret-key-456");
      expect(match).toBe(false);
    });

    it("should return false for different lengths", async () => {
      const match = await constantTimeEquals("short", "much-longer-string");
      expect(match).toBe(false);
    });

    it("should return false when expected is undefined or empty", async () => {
      expect(await constantTimeEquals("token", undefined)).toBe(false);
      expect(await constantTimeEquals("token", "")).toBe(false);
      expect(await constantTimeEquals("", "token")).toBe(false);
    });
  });

  describe("extractPresentedKey", () => {
    it("should extract token from Authorization Bearer header", () => {
      const headers = new Headers({
        Authorization: "Bearer my-secret-token"
      });
      expect(extractPresentedKey(headers)).toBe("my-secret-token");
    });

    it("should extract token from x-api-key header", () => {
      const headers = new Headers({
        "x-api-key": "my-api-key"
      });
      expect(extractPresentedKey(headers)).toBe("my-api-key");
    });

    it("should return null if no auth headers present", () => {
      const headers = new Headers();
      expect(extractPresentedKey(headers)).toBeNull();
    });
  });

  describe("isRequestAuthorized", () => {
    const mockEnv: Env = {
      DISCORD_MCP_KEY: "valid-agent-key"
    };

    it("should authorize requests with valid Bearer token", async () => {
      const request = new Request("https://discord-mcp.internal/mcp", {
        headers: { Authorization: "Bearer valid-agent-key" }
      });
      const authorized = await isRequestAuthorized(request, mockEnv);
      expect(authorized).toBe(true);
    });

    it("should reject requests with invalid Bearer token", async () => {
      const request = new Request("https://discord-mcp.internal/mcp", {
        headers: { Authorization: "Bearer wrong-key" }
      });
      const authorized = await isRequestAuthorized(request, mockEnv);
      expect(authorized).toBe(false);
    });

    it("should reject requests if DISCORD_MCP_KEY is not configured", async () => {
      const request = new Request("https://discord-mcp.internal/mcp", {
        headers: { Authorization: "Bearer valid-agent-key" }
      });
      const authorized = await isRequestAuthorized(request, {});
      expect(authorized).toBe(false);
    });
  });

  describe("unauthorizedResponse", () => {
    it("should return HTTP 401 with standard JSON-RPC error format", async () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
      expect(response.headers.get("WWW-Authenticate")).toBe('Bearer realm="discord-mcp"');

      const body = await response.json();
      expect(body).toEqual({
        jsonrpc: "2.0",
        id: null,
        error: {
          code: -32001,
          message: "Unauthorized: Invalid or missing API Key"
        }
      });
    });
  });
});
