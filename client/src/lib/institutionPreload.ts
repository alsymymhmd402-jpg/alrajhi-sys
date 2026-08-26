import { brandAssets } from "@/lib/brandAssets";

export const institutionUrl = "https://alwaleedphilanthropies.org/ar?hl=ar-YE";

const preloadKey = "voice-circle:institution-site-preloaded:v2";
const localAssetUrls = [brandAssets.institutionWordmark, brandAssets.institutionSeal, brandAssets.kingdomWatermark, brandAssets.institutionGreenSplash, brandAssets.channelAvatars.finance, brandAssets.channelAvatars.followUp, brandAssets.channelAvatars.privateOffice, brandAssets.channelCovers.institution, brandAssets.channelCovers.finance, brandAssets.channelCovers.followUp, brandAssets.channelCovers.privateOffice];
const cacheWindowMs = 7 * 24 * 60 * 60 * 1000;

export function hasInstitutionPreload() {
  try {
    const timestamp = Number(window.localStorage.getItem(preloadKey));
    return Number.isFinite(timestamp) && Date.now() - timestamp < cacheWindowMs;
  } catch {
    return false;
  }
}

export function markInstitutionPreloaded() {
  try { window.localStorage.setItem(preloadKey, String(Date.now())); } catch { /* التخزين اختياري عند حظر المتصفح له. */ }
}

export function addInstitutionResourceHints() {
  if (document.head.querySelector("[data-institution-preconnect]")) return;
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  preconnect.href = "https://alwaleedphilanthropies.org";
  preconnect.setAttribute("data-institution-preconnect", "true");
  document.head.appendChild(preconnect);
  const prefetch = document.createElement("link");
  prefetch.rel = "prefetch";
  prefetch.href = institutionUrl;
  prefetch.as = "document";
  prefetch.setAttribute("data-institution-prefetch", "true");
  document.head.appendChild(prefetch);

  localAssetUrls.forEach((href, index) => {
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = href;
    preload.setAttribute("data-client-channel-preload", String(index));
    document.head.appendChild(preload);
  });
}

async function warmLocalAssets() {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open("voice-circle-assets-v2");
    await Promise.all(localAssetUrls.map(async url => {
      if (await cache.match(url)) return;
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (response.ok) await cache.put(url, response.clone());
      } catch { /* سيعاد المحاولة بهدوء في الزيارة التالية. */ }
    }));
  } catch { /* Cache API غير متاح في بعض المتصفحات الخاصة. */ }
}

export function primeInstitutionSite() {
  addInstitutionResourceHints();
  void warmLocalAssets();
  if (hasInstitutionPreload() || document.body.querySelector("[data-institution-primer]")) return;
  const frame = document.createElement("iframe");
  frame.src = institutionUrl;
  frame.tabIndex = -1;
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("data-institution-primer", "true");
  frame.style.cssText = "position:fixed;left:-9999px;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0";
  const finish = () => { markInstitutionPreloaded(); window.setTimeout(() => frame.remove(), 1500); };
  frame.addEventListener("load", finish, { once: true });
  document.body.appendChild(frame);
}
