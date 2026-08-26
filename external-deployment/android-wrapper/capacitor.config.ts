import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.alwaleed.morasalat",
  appName: "مراسلة المؤسسة",
  webDir: "www",
  server: {
    url: "https://voicecall-uwxhmyez.manus.space/client/start",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
