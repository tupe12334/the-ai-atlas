import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  use: { baseURL: "http://localhost:4399/the-ai-atlas/" },
  webServer: {
    command: "pnpm build && pnpm preview --port 4399 --ignore-lock",
    url: "http://localhost:4399/the-ai-atlas/",
    reuseExistingServer: false,
  },
});
