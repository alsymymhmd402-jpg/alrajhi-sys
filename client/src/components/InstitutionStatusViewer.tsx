import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Eye,
  Pause,
  Play,
  X,
} from "lucide-react";
import { CSSProperties, useEffect, useMemo, useState } from "react";

type MediaFilter = "none" | "warm" | "cool" | "mono" | "vivid" | "fade";
type TextFont = "modern" | "classic" | "handwritten" | "bold";
type TextAlign = "right" | "center" | "left";

const filterStyles: Record<MediaFilter, string> = {
  none: "none",
  warm: "sepia(.22) saturate(1.18) contrast(1.04)",
  cool: "hue-rotate(168deg) saturate(.82) contrast(1.05)",
  mono: "grayscale(1) contrast(1.13)",
  vivid: "saturate(1.42) contrast(1.13)",
  fade: "saturate(.72) contrast(.9) brightness(1.08)",
};
const fontFamilies: Record<TextFont, string> = {
  modern: "var(--font-sans, Arial, sans-serif)",
  classic: "Georgia, 'Times New Roman', serif",
  handwritten: "cursive",
  bold: "var(--font-sans, Arial, sans-serif)",
};

function textStyle(status: {
  textColor: string;
  textFont: TextFont;
  textAlign: TextAlign;
  textPositionX: number;
  textPositionY: number;
}): CSSProperties {
  return {
    color: status.textColor,
    fontFamily: fontFamilies[status.textFont],
    fontWeight: status.textFont === "bold" ? 800 : 700,
    textAlign: status.textAlign,
    left: `${status.textPositionX}%`,
    top: `${status.textPositionY}%`,
    transform: "translate(-50%, -50%)",
  };
}

export function InstitutionStatusViewer({
  publicId,
  accessToken,
}: {
  publicId: string;
  accessToken: string;
}) {
  const statusesQuery = trpc.institutionStatuses.guestList.useQuery(
    { publicId, accessToken },
    { refetchInterval: 20_000 }
  );
  const markViewed = trpc.institutionStatuses.markViewed.useMutation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const statuses = statusesQuery.data ?? [];
  const active = activeIndex === null ? null : statuses[activeIndex];

  useEffect(() => {
    if (!active || paused || active.mediaType === "video") return;
    setElapsed(0);
    const interval = window.setInterval(
      () => setElapsed(value => Math.min(100, value + 2)),
      100
    );
    return () => window.clearInterval(interval);
  }, [active?.id, active?.mediaType, paused]);

  useEffect(() => {
    if (active && active.mediaType === "image" && elapsed >= 100) {
      setActiveIndex(index =>
        index === null || index >= statuses.length - 1 ? null : index + 1
      );
    }
  }, [active, elapsed, statuses.length]);

  useEffect(() => {
    if (!active) return;
    markViewed.mutate({ publicId, accessToken, statusId: active.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id]);

  const cover = useMemo(() => statuses[statuses.length - 1], [statuses]);
  if (!statusesQuery.isLoading && !cover) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setActiveIndex(0)}
        className="mb-5 flex w-full items-center gap-3 rounded-2xl border border-emerald-100 bg-white p-3 text-right shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/50"
        aria-label="فتح حالات المؤسسة"
      >
        <div className="relative shrink-0 rounded-full bg-gradient-to-tr from-[#075e54] via-[#25d366] to-[#075e54] p-[3px]">
          <div className="size-12 overflow-hidden rounded-full border-2 border-white bg-emerald-100">
            {cover?.mediaType === "video" ? (
              <video
                src={cover.mediaUrl}
                className="h-full w-full object-cover"
                muted
              />
            ) : cover ? (
              <img
                src={cover.mediaUrl}
                alt="آخر حالة للمؤسسة"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <CirclePlay className="size-5 text-[#075e54]" />
              </div>
            )}
          </div>
          <span className="absolute -bottom-0.5 -left-0.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-[#128c7e] text-white">
            <CirclePlay className="size-3" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold text-slate-900">حالات المؤسسة</p>
          <p className="mt-1 text-xs text-slate-500">
            {statusesQuery.isLoading
              ? "جارٍ تحميل الحالات…"
              : `${statuses.length} ${statuses.length === 1 ? "حالة جديدة" : "حالات متاحة"}`}
          </p>
        </div>
        <ChevronLeft className="size-5 text-[#128c7e]" />
      </button>

      {active && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/95 p-0 sm:p-6"
          dir="rtl"
        >
          <div className="relative h-full w-full overflow-hidden bg-slate-950">
            <div
              className="absolute inset-x-3 top-3 z-30 flex gap-1.5"
              dir="ltr"
            >
              {statuses.map((status, index) => (
                <div
                  key={status.id}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/35"
                >
                  <div
                    className="h-full bg-white transition-[width] duration-100"
                    style={{
                      width:
                        index < (activeIndex ?? 0)
                          ? "100%"
                          : index === (activeIndex ?? 0)
                            ? active.mediaType === "image"
                              ? `${elapsed}%`
                              : "100%"
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>
            <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent px-5 pb-8 pt-9 text-white">
              <div className="flex items-center gap-3">
                <img
                  src="/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg"
                  alt="مؤسسة الوليد بن طلال الإنسانية"
                  className="size-9 rounded-full border border-white/40 object-cover"
                />
                <div>
                  <p className="text-sm font-bold">مؤسسة الوليد الإنسانية</p>
                  <p className="mt-0.5 text-[11px] text-white/70">حالة جديدة</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPaused(value => !value)}
                  className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
                  aria-label={paused ? "تشغيل الحالة" : "إيقاف الحالة"}
                >
                  {paused ? (
                    <Play className="size-4" />
                  ) : (
                    <Pause className="size-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setActiveIndex(null)}
                  className="size-9 rounded-full text-white hover:bg-white/15 hover:text-white"
                  aria-label="إغلاق الحالات"
                >
                  <X className="size-5" />
                </Button>
              </div>
            </header>
            {active.mediaType === "video" ? (
              <video
                key={active.id}
                src={active.mediaUrl}
                className="h-full w-full object-contain"
                style={{ filter: filterStyles[active.mediaFilter] }}
                autoPlay
                muted={false}
                controls
                onEnded={() =>
                  setActiveIndex(index =>
                    index === null || index >= statuses.length - 1
                      ? null
                      : index + 1
                  )
                }
              />
            ) : (
              <img
                src={active.mediaUrl}
                alt="حالة المؤسسة"
                className="h-full w-full object-contain"
                style={{ filter: filterStyles[active.mediaFilter] }}
              />
            )}
            {active.textContent && (
              <p
                className="pointer-events-none absolute z-10 max-w-[82%] break-words px-2 text-xl leading-9 drop-shadow-[0_2px_5px_rgba(0,0,0,.82)]"
                style={textStyle(active)}
              >
                {active.textContent}
              </p>
            )}
            <button
              type="button"
              onClick={() =>
                setActiveIndex(index =>
                  index === null ? null : Math.max(0, index - 1)
                )
              }
              className="absolute inset-y-0 right-0 z-10 w-1/3 cursor-w-resize"
              aria-label="الحالة السابقة"
            />
            <button
              type="button"
              onClick={() =>
                setActiveIndex(index =>
                  index === null || index >= statuses.length - 1
                    ? null
                    : index + 1
                )
              }
              className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-e-resize"
              aria-label="الحالة التالية"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex items-center justify-center gap-1 bg-gradient-to-t from-black/55 to-transparent pb-5 pt-10 text-xs text-white/80">
              <Eye className="size-3.5" />
              اسحب أو اضغط للانتقال
            </div>
          </div>
        </div>
      )}
    </>
  );
}
