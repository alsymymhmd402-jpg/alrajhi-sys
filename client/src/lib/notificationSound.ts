import { brandAssets } from "./brandAssets";

let notificationAudio: HTMLAudioElement | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  notificationAudio ??= new Audio(brandAssets.sounds.notification);
  notificationAudio.currentTime = 0;
  void notificationAudio.play().catch(() => undefined);
}
