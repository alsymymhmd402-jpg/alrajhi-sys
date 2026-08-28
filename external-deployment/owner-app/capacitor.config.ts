import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.alwaleed.operations",
  appName: "غرفة عمليات مؤسسة الوليد بن طلال",
  webDir: "www",
  server: {
    url: "https://voicecall-uwxhmyez.manus.space/",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
