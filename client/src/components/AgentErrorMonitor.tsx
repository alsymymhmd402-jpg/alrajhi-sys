import { trpc } from "@/lib/trpc";
import { useEffect, useRef } from "react";

function safeDetail(value: unknown) {
  const text = value instanceof Error ? value.message : String(value ?? "خطأ غير معروف");
  return text.replace(/https?:\/\/\S+/g, "[عنوان محجوب]").replace(/sk_[\w-]+/g, "[قيمة محجوبة]").slice(0, 500);
}

export function AgentErrorMonitor() {
  const reportAlert = trpc.agent.reportAlert.useMutation();
  const reported = useRef(new Set<string>());

  useEffect(() => {
    const report = (title: string, detail: unknown, source: string) => {
      const safe = safeDetail(detail);
      const fingerprint = `${source}:${title}:${safe}`;
      if (reported.current.has(fingerprint)) return;
      reported.current.add(fingerprint);
      reportAlert.mutate({ severity: "error", title, detail: safe, source });
    };
    const onError = (event: ErrorEvent) => report("خطأ في واجهة غرفة العمليات", event.error ?? event.message, "browser.error");
    const onRejection = (event: PromiseRejectionEvent) => report("عملية غير مكتملة في غرفة العمليات", event.reason, "browser.unhandledrejection");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, [reportAlert]);

  return null;
}
