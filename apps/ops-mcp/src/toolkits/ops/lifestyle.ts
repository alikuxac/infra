import { z } from "zod";
import { Toolkit, ToolkitRegistry } from "../../core/registry.js";

/**
 * LifestyleToolkit - Tools for Gaming, Travel, Cinema and Hobbies
 */
export class LifestyleToolkit implements Toolkit {
    name = "Lifestyle Toolkit";
    description = "Công cụ hỗ trợ giải trí, du lịch, điện ảnh và sở thích cá nhân.";

    register(registry: ToolkitRegistry): void {
        // 1. Gaming News (Simulated)
        registry.registerTool(
            {
                name: "lifestyle_get_gaming_news",
                description: "Lấy tin tức mới nhất về các tựa game nổi tiếng, patch notes và sự kiện gacha.",
                category: "ops",
                inputSchema: z.object({
                    game: z.string().describe("Tên game (ví dụ: Genshin Impact, Honkai Star Rail, LOL)")
                })
            },
            async ({ game }) => {
                return {
                    content: [{
                        type: "text",
                        text: `Latest News for ${game}: New patch 5.1 incoming, character balance shifts, and upcoming premium banner.`
                    }]
                };
            }
        );

        // 2. Movie/Show Recommendations
        registry.registerTool(
            {
                name: "lifestyle_search_movies",
                description: "Tìm kiếm thông tin phim và gợi ý các bộ phim/show truyền hình đang hot.",
                category: "ops",
                inputSchema: z.object({
                    genre: z.string(),
                    platform: z.enum(["Netflix", "HBO", "Disney+", "Cinema"])
                })
            },
            async ({ genre, platform }) => {
                return {
                    content: [{
                        type: "text",
                        text: `Top ${genre} on ${platform}: 'The Alikuxac Journey', 'Automation World', 'Luxury Tech Odyssey'.`
                    }]
                };
            }
        );

        // 3. Travel Planning Assistant
        registry.registerTool(
            {
                name: "lifestyle_plan_trip",
                description: "Hỗ trợ lập kế hoạch du lịch, tìm kiếm địa điểm và chuyến bay (Mô phỏng).",
                category: "ops",
                inputSchema: z.object({
                    destination: z.string(),
                    budget: z.enum(["Economy", "Premium", "Luxury"])
                })
            },
            async ({ destination, budget }) => {
                return {
                    content: [{
                        type: "text",
                        text: `Trip to ${destination} (${budget}): Best luxury resort booked, private jet scheduled, AI assistant ready for itinerary management.`
                    }]
                };
            }
        );
    }
}
