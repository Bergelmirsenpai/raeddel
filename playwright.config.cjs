const { defineConfig } = require("playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  use: { baseURL: "http://127.0.0.1:8187/raeddel/" },
  webServer: {
    command: "python3 -m http.server 8187 --bind 127.0.0.1 --directory ..",
    url: "http://127.0.0.1:8187/raeddel/",
    reuseExistingServer: !process.env.CI,
  },
});
