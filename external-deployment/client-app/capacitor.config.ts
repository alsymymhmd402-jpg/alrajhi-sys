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
  plugins: {
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
