const FEATURE_DATA_URL = "./pricing-card-features.json";
const HOSTED_PAGE_URL =
  "http://localhost:8764/sites/01KKEZN9VSGC0AKPZ5DH1QRXT5/pricing/01KKPKDBMGFKEG43KRBEF7ZPW1";
const MESSAGE_TYPE = "pricify.hosted.page.setFeatureForPricingCard";
const MESSAGE_ATTEMPTS = 12;
const MESSAGE_INTERVAL_MS = 400;
const SETTLE_DELAY_MS = 2500;

const iframe = document.getElementById("pricify-frame");
const featureTargetContainer = document.getElementById("feature-target-container");
const selectedFeatureId = new URLSearchParams(window.location.search).get("featureId");
const iframeOrigin = new URL(HOSTED_PAGE_URL).origin;

function setRenderStatus(status) {
  document.body.dataset.renderStatus = status;
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function loadFeatureConfigs() {
  const response = await fetch(FEATURE_DATA_URL);

  if (!response.ok) {
    throw new Error("Failed to load pricing card feature data.");
  }

  return response.json();
}

function getActiveFeatureConfig(featureConfigs) {
  return featureConfigs.find(({ id }) => id === selectedFeatureId) ?? featureConfigs[0];
}

function renderTarget(id) {
  featureTargetContainer.replaceChildren();

  const target = document.createElement("div");
  target.id = id;
  featureTargetContainer.appendChild(target);
}

function createHostedPageUrl(id) {
  const url = new URL(HOSTED_PAGE_URL);
  url.searchParams.set("featureConfigId", id);
  url.searchParams.set("hostRenderNonce", `${Date.now()}`);
  return url.toString();
}

function waitForIframeLoad() {
  return new Promise((resolve) => {
    iframe.addEventListener("load", resolve, { once: true });
  });
}

function buildFeatureMessage(features) {
  return {
    type: MESSAGE_TYPE,
    payload: {
      features,
    },
  };
}

async function postFeatures(features) {
  for (let attempt = 0; attempt < MESSAGE_ATTEMPTS; attempt += 1) {
    iframe.contentWindow.postMessage(buildFeatureMessage(features), iframeOrigin);
    await delay(attempt === 0 ? 0 : MESSAGE_INTERVAL_MS);
  }
}

async function renderFeatureConfig(featureConfig) {
  renderTarget(featureConfig.id);
  setRenderStatus("loading-frame");

  const iframeLoadPromise = waitForIframeLoad();
  iframe.src = createHostedPageUrl(featureConfig.id);
  await iframeLoadPromise;

  setRenderStatus("sending-message");
  await postFeatures(featureConfig.featureRichMarkdownText);
  await delay(SETTLE_DELAY_MS);
  setRenderStatus("ready");
}

async function main() {
  setRenderStatus("booting");

  const featureConfigs = await loadFeatureConfigs();
  const activeFeatureConfig = getActiveFeatureConfig(featureConfigs);

  if (!activeFeatureConfig) {
    throw new Error("No pricing card feature configuration was found.");
  }

  await renderFeatureConfig(activeFeatureConfig);
}

main().catch((error) => {
  setRenderStatus("error");
  console.error(error);
});
