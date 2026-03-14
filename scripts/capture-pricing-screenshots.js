const fs = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require("playwright-core");

const projectRoot = path.resolve(__dirname, "..");
const featureDataPath = path.join(projectRoot, "data", "pricing-card-features.json");
const screenshotDir = path.join(projectRoot, "assets", "screenshots");
const iframeUrl =
  "http://localhost:8764/sites/01KKEZN9VSGC0AKPZ5DH1QRXT5/pricing/01KKPKDBMGFKEG43KRBEF7ZPW1";
const viewport = { width: 1440, height: 1400 };
const renderTimeoutMs = 30000;
const settleDelayMs = 3000;
const messageType = "pricify.hosted.page.setFeatureForPricingCard";
const messageAttempts = 12;
const messageIntervalMs = 400;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};

function getBrowserExecutablePath() {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];

  return candidates.find((candidate) => require("node:fs").existsSync(candidate));
}

function createStaticServer(rootDir) {
  return http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, "http://127.0.0.1");
      const relativePath =
        requestUrl.pathname === "/" ? "/app/index.html" : decodeURIComponent(requestUrl.pathname);
      const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
      const filePath = path.join(rootDir, normalizedPath);

      if (!filePath.startsWith(rootDir)) {
        response.writeHead(403);
        response.end("Forbidden");
        return;
      }

      const content = await fs.readFile(filePath);
      const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";

      response.writeHead(200, { "Content-Type": contentType });
      response.end(content);
    } catch (error) {
      response.writeHead(404);
      response.end("Not found");
    }
  });
}

async function ensureIframeIsReachable() {
  const response = await fetch(iframeUrl, { method: "GET" }).catch(() => null);

  if (!response || !response.ok) {
    throw new Error(
      `The hosted pricing page is not reachable at ${iframeUrl}. Start that local server before running screenshots.`
    );
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function getFeaturePageUrl(baseUrl, featureId) {
  return `${baseUrl}/app/index.html?featureId=${encodeURIComponent(featureId)}`;
}

function getScreenshotPath(featureId) {
  return path.join(screenshotDir, `${slugify(featureId)}.png`);
}

async function waitForRenderReady(page) {
  await page.waitForFunction(() => document.body.dataset.renderStatus === "ready", null, {
    timeout: renderTimeoutMs,
  });
}

async function resendFeaturePayload(page, featureRichMarkdownText) {
  await page.evaluate(async ({ features, type, attempts, intervalMs }) => {
    const iframe = document.getElementById("pricify-frame");
    const iframeOrigin = new URL(iframe.src).origin;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      iframe.contentWindow.postMessage(
        {
          type,
          payload: {
            features,
          },
        },
        iframeOrigin
      );

      await new Promise((resolve) => {
        window.setTimeout(resolve, attempt === 0 ? 0 : intervalMs);
      });
    }
  }, {
    features: featureRichMarkdownText,
    type: messageType,
    attempts: messageAttempts,
    intervalMs: messageIntervalMs,
  });
}

async function captureFeatureScreenshot(browser, baseUrl, featureConfig) {
  const context = await browser.newContext({ viewport });

  try {
    const page = await context.newPage();
    await page.goto(getFeaturePageUrl(baseUrl, featureConfig.id), { waitUntil: "load" });
    await waitForRenderReady(page);
    await resendFeaturePayload(page, featureConfig.featureRichMarkdownText);
    await page.waitForTimeout(settleDelayMs);
    await page.locator("#pricify-frame").screenshot({
      path: getScreenshotPath(featureConfig.id),
    });
  } finally {
    await context.close();
  }
}

async function startStaticServer(rootDir) {
  const server = createStaticServer(rootDir);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

async function stopStaticServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function main() {
  const executablePath = getBrowserExecutablePath();

  if (!executablePath) {
    throw new Error("No supported local browser was found. Install Google Chrome or Microsoft Edge.");
  }

  await ensureIframeIsReachable();

  const featureConfigs = JSON.parse(await fs.readFile(featureDataPath, "utf8"));

  if (!Array.isArray(featureConfigs) || featureConfigs.length === 0) {
    throw new Error("data/pricing-card-features.json must contain at least one feature configuration.");
  }

  await fs.mkdir(screenshotDir, { recursive: true });

  const { server, baseUrl } = await startStaticServer(projectRoot);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
  });

  try {
    for (const featureConfig of featureConfigs) {
      await captureFeatureScreenshot(browser, baseUrl, featureConfig);
    }
  } finally {
    await browser.close();
    await stopStaticServer(server);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
