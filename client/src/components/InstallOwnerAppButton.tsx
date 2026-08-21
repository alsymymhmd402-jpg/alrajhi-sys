import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function InstallOwnerAppButton() {
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
    if (result.outcome === "accepted") toast.success("تمت إضافة غرفة عمليات المؤسسة إلى جهازك.");
    setDeferredPrompt(null);
  };
  return <Button variant="outline" size="sm" className="w-full justify-center border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => void install()}><Download className="ml-2 size-4" />تثبيت غرفة العمليات</Button>;
}
