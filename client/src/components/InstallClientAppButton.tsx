import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallClientAppButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<InstallPromptEvent | null>(null);
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferredPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const install = async () => {
    if (!deferredPrompt) { toast.message("استخدم خيار «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» من قائمة المتصفح."); return; }
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === "accepted") toast.success("تمت إضافة مراسلة المؤسسة إلى جهازك.");
    setDeferredPrompt(null);
  };
  return <Button variant="ghost" size="icon" className="size-9 text-white hover:bg-white/15 hover:text-white" onClick={() => void install()} aria-label="تثبيت مراسلة المؤسسة"><Download className="size-5" /></Button>;
}
