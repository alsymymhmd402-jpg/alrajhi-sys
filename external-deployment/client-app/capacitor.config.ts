import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.alwaleed.customer",
  appName: "خدمة عملاء مؤسسة الوليد بن طلال",
  webDir: "www",
  server: {
    url: "https://voicecall-uwxhmyez.manus.space/client/start",
    cleartext: false,
    androidScheme: "https",
  },
};

export default config;
