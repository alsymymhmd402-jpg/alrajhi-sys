import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CustomerUiComponent,
  CustomerUiComponentType,
  CustomerUiDocument,
  defaultCustomerUiDocument,
} from "@shared/customerUi";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Bell,
  Blocks,
  Box,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ContactRound,
  Copy,
  Crop,
  Eye,
  FileText,
  History,
  Image,
  Layers3,
  LayoutTemplate,
  Link2,
  Loader2,
  LockKeyhole,
  Minus,
  Monitor,
  MousePointer2,
  Move,
  Paintbrush,
  PanelRight,
  Plus,
  Redo2,
  Save,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  SquareDashedMousePointer,
  Trash2,
  Type,
  Undo2,
  UnlockKeyhole,
  UploadCloud,
  UserRound,
  UsersRound,
} from "lucide-react";
import {
  CSSProperties,
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

type PreviewMode = "mobile" | "desktop";
type DragState = {
  id: string;
  mode: "move" | "resize";
  startX: number;
  startY: number;
  initial: CustomerUiComponent;
  initialDocument: CustomerUiDocument;
  rect: DOMRect;
} | null;
type PreviewProfile =
  | {
      displayName: string;
      phone: string | null;
      email: string | null;
      avatarUrl: string | null;
    }
  | undefined;
type PreviewRequest =
  | { requestNumber: string; title: string; status: string }
  | null
  | undefined;

const componentLibrary: Array<{
  type: CustomerUiComponentType;
  label: string;
  icon: typeof Type;
  color: string;
}> = [
  {
    type: "image",
    label: "صورة",
    icon: Image,
    color: "text-violet-600 bg-violet-50",
  },
  {
    type: "title",
    label: "عنوان",
    icon: Type,
    color: "text-blue-600 bg-blue-50",
  },
  {
    type: "text",
    label: "نص",
    icon: FileText,
    color: "text-slate-600 bg-slate-100",
  },
  {
    type: "button",
    label: "زر",
    icon: MousePointer2,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    type: "card",
    label: "بطاقة",
    icon: Box,
    color: "text-orange-600 bg-orange-50",
  },
  {
    type: "status",
    label: "حالة الطلب",
    icon: ClipboardCheck,
    color: "text-rose-600 bg-rose-50",
  },
  {
    type: "divider",
    label: "فاصل",
    icon: Minus,
    color: "text-slate-600 bg-slate-100",
  },
  {
    type: "container",
    label: "حاوية",
    icon: SquareDashedMousePointer,
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    type: "badge",
    label: "شارة",
    icon: Sparkles,
    color: "text-amber-600 bg-amber-50",
  },
  {
    type: "notification",
    label: "تنبيه",
    icon: Bell,
    color: "text-pink-600 bg-pink-50",
  },
  {
    type: "link",
    label: "رابط",
    icon: Link2,
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    type: "profile",
    label: "بيانات العميل",
    icon: UserRound,
    color: "text-cyan-700 bg-cyan-50",
  },
  {
    type: "application",
    label: "حالة القبول",
    icon: BadgeCheck,
    color: "text-emerald-700 bg-emerald-50",
  },
  {
    type: "spacer",
    label: "مساحة",
    icon: ArrowDownToLine,
    color: "text-slate-500 bg-slate-100",
  },
];

const typeLabels: Record<CustomerUiComponentType, string> = {
  image: "صورة",
  title: "عنوان",
  text: "نص",
  button: "زر",
  icon: "أيقونة",
  card: "بطاقة",
  status: "حالة الطلب",
  divider: "فاصل",
  container: "حاوية",
  badge: "شارة",
  list: "قائمة",
  link: "رابط",
  notification: "تنبيه",
  spacer: "مساحة",
  profile: "بيانات العميل",
  application: "حالة القبول",
};
const fontNames = {
  modern: "Arial, sans-serif",
  classic: "Georgia, serif",
  bold: "Arial, sans-serif",
  rounded: "ui-rounded, Arial, sans-serif",
};
const filterCss = {
  none: "none",
  warm: "sepia(.26) saturate(1.18)",
  cool: "hue-rotate(168deg) saturate(.82)",
  mono: "grayscale(1)",
  vivid: "saturate(1.55) contrast(1.06)",
  soft: "brightness(1.06) contrast(.88)",
} as const;
const requestStatusLabels: Record<string, string> = {
  new: "تم استلام الطلب",
  in_progress: "قيد المراجعة",
  waiting: "بانتظار استكمال المعلومات",
  completed: "تم اكتمال الإجراء",
  closed: "أُغلقت المتابعة",
};

function nextComponent(
  type: CustomerUiComponentType,
  index: number,
  y: number
): CustomerUiComponent {
  const id = `${type}-${Date.now()}-${index}`;
  const style = {
    color: "#0f172a",
    background: "#ffffff",
    fontFamily: "modern" as const,
    fontSize: 14,
    fontWeight: 500,
    lineHeight: 1.5,
    letterSpacing: 0,
    textAlign: "right" as const,
    borderRadius: 14,
    opacity: 1,
    padding: 10,
    objectFit: "cover" as const,
    objectPositionX: 50,
    objectPositionY: 50,
    imageScale: 1,
    filterPreset: "none" as const,
    borderWidth: 0,
    borderColor: "#ffffff",
    shadow: false,
  };
  const common = {
    id,
    type,
    label: typeLabels[type],
    x: 10,
    y,
    width: 80,
    height: 12,
    visible: true,
    locked: false,
    style,
    action: { type: "none" as const },
  };
  if (type === "image")
    return {
      ...common,
      content: "/manus-storage/alwaleed-philanthropies-mark_d87d264e.jpg",
      height: 30,
      label: "صورة المؤسسة",
    };
  if (type === "title")
    return {
      ...common,
      content: "عنوان جديد",
      height: 10,
      style: { ...style, fontSize: 22, fontWeight: 800 },
    };
  if (type === "button")
    return {
      ...common,
      content: "زر إجراء",
      style: {
        ...style,
        color: "#ffffff",
        background: "#128c7e",
        textAlign: "center",
        fontWeight: 800,
      },
      action: { type: "chat" },
    };
  if (type === "status")
    return {
      ...common,
      content: "حالة الطلب",
      height: 27,
      style: { ...style, background: "#ecfdf5", color: "#075e54" },
      action: { type: "application" },
      statusSteps: [
        { id: "received", label: "تم الاستلام", color: "#128c7e" },
        { id: "review", label: "قيد المراجعة", color: "#f59e0b" },
        { id: "complete", label: "مكتمل", color: "#2563eb" },
      ],
      statusCurrent: 1,
    };
  if (type === "divider")
    return {
      ...common,
      content: "",
      height: 3,
      style: { ...style, background: "#e2e8f0", padding: 0 },
    };
  if (type === "notification")
    return {
      ...common,
      content: "تم تحديث معلوماتك داخل التطبيق",
      style: { ...style, background: "#eff6ff", color: "#1d4ed8" },
    };
  if (type === "profile")
    return {
      ...common,
      content: "بيانات العميل",
      height: 18,
      style: {
        ...style,
        background: "#ecfeff",
        color: "#155e75",
        borderRadius: 18,
        padding: 12,
      },
      action: { type: "profile" },
      profileFields: ["name", "phone", "email"],
    };
  if (type === "application")
    return {
      ...common,
      content: "حالة القبول والمتابعة",
      height: 14,
      style: {
        ...style,
        background: "#ecfdf5",
        color: "#065f46",
        borderRadius: 18,
        padding: 12,
      },
      action: { type: "application" },
    };
  if (type === "badge")
    return {
      ...common,
      content: "جديد",
      width: 26,
      height: 7,
      style: {
        ...style,
        background: "#fef3c7",
        color: "#92400e",
        textAlign: "center",
        borderRadius: 999,
      },
    };
  if (type === "spacer")
    return {
      ...common,
      content: "",
      height: 8,
      style: { ...style, background: "#ffffff", opacity: 0.2 },
    };
  return {
    ...common,
    content:
      type === "card" || type === "container"
        ? "بطاقة قابلة للتخصيص"
        : type === "link"
          ? "افتح الرابط"
          : "نص جديد",
  };
}

function ComponentRender({
  component,
  selected,
  contentHeight,
  onPointerDown,
  onSelect,
  profile,
  request,
}: {
  component: CustomerUiComponent;
  selected: boolean;
  contentHeight: number;
  onPointerDown: (
    event: ReactPointerEvent<HTMLElement>,
    mode: "move" | "resize"
  ) => void;
  onSelect: () => void;
  profile: PreviewProfile;
  request: PreviewRequest;
}) {
  if (!component.visible) return null;
  const style = component.style;
  const layout: CSSProperties = {
    position: "absolute",
    left: `${component.x}%`,
    top: `${(component.y / contentHeight) * 100}%`,
    width: `${component.width}%`,
    height: `${(component.height / contentHeight) * 100}%`,
    color: style.color,
    background: style.background,
    borderRadius: style.borderRadius,
    opacity: style.opacity,
    padding: style.padding,
    fontFamily: fontNames[style.fontFamily ?? "modern"],
    fontSize: style.fontSize,
    fontWeight: style.fontWeight,
    lineHeight: style.lineHeight,
    letterSpacing: style.letterSpacing,
    textAlign: style.textAlign,
    overflow: "hidden",
    userSelect: "none",
    touchAction: "none",
    border: `${style.borderWidth ?? 0}px solid ${style.borderColor ?? "#ffffff"}`,
    boxShadow: style.shadow ? "0 12px 25px rgba(15,23,42,.16)" : undefined,
  };
  const profileFields = component.profileFields ?? ["name", "phone", "email"];
  const inner =
    component.type === "image" ? (
      <div
        className="h-full w-full overflow-hidden"
        style={{
          borderRadius: Math.max(
            0,
            (style.borderRadius ?? 0) - (style.borderWidth ?? 0)
          ),
        }}
      >
        <img
          src={component.content}
          alt={component.label}
          className="h-full w-full"
          style={{
            objectFit: style.objectFit,
            objectPosition: `${style.objectPositionX ?? 50}% ${style.objectPositionY ?? 50}%`,
            filter: filterCss[style.filterPreset ?? "none"],
            transform: `scale(${style.imageScale ?? 1})`,
          }}
          draggable={false}
        />
      </div>
    ) : component.type === "profile" ? (
      <div className="flex h-full w-full items-center gap-3 overflow-hidden">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/70">
          <UserRound className="size-4" />
        </div>
        <div className="min-w-0 space-y-1">
          {profileFields.map(field => (
            <p
              key={field}
              className={
                field === "name"
                  ? "truncate font-bold"
                  : "truncate text-[10px] opacity-80"
              }
            >
              {field === "name"
                ? (profile?.displayName ?? "اسم العميل")
                : field === "phone"
                  ? (profile?.phone ?? "رقم الهاتف غير مسجل")
                  : (profile?.email ?? "البريد الإلكتروني غير مسجل")}
            </p>
          ))}
        </div>
      </div>
    ) : component.type === "application" ? (
      <div className="flex h-full w-full items-center gap-3 overflow-hidden">
        <ContactRound className="size-6 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-bold">
            {component.content || "حالة القبول والمتابعة"}
          </p>
          <p className="mt-1 truncate text-[10px] opacity-80">
            {request
              ? `${requestStatusLabels[request.status] ?? request.status} · ${request.requestNumber}`
              : "لا يوجد طلب مرتبط حالياً"}
          </p>
        </div>
      </div>
    ) : component.type === "status" ? (
      <div className="h-full w-full space-y-2 overflow-hidden">
        <p className="font-bold">{component.content || "حالة الطلب"}</p>
        {component.statusSteps?.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2 text-[10px]">
            <span
              className="flex size-4 shrink-0 items-center justify-center rounded-full text-[9px] text-white"
              style={{
                background:
                  index <= (component.statusCurrent ?? 0)
                    ? step.color
                    : "#cbd5e1",
              }}
            >
              {index + 1}
            </span>
            <span
              className={
                index <= (component.statusCurrent ?? 0)
                  ? "font-bold"
                  : "text-slate-400"
              }
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    ) : component.type === "divider" || component.type === "spacer" ? (
      <div className="h-full w-full" />
    ) : (
      <div
        className="flex h-full w-full whitespace-pre-wrap"
        style={{
          justifyContent:
            style.textAlign === "center"
              ? "center"
              : style.textAlign === "left"
                ? "flex-start"
                : "flex-end",
          alignItems: "center",
        }}
      >
        {component.content}
      </div>
    );
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={component.label}
      onClick={event => {
        event.stopPropagation();
        onSelect();
      }}
      onPointerDown={event => onPointerDown(event, "move")}
      className={`group absolute cursor-move transition-shadow ${selected ? "z-30 ring-2 ring-blue-500 ring-offset-2" : "hover:ring-1 hover:ring-blue-300"}`}
      style={layout}
    >
      {inner}
      {selected && (
        <button
          type="button"
          aria-label="تغيير حجم العنصر"
          onPointerDown={event => {
            event.stopPropagation();
            onPointerDown(event, "resize");
          }}
          className="absolute -bottom-1 -left-1 size-4 cursor-nwse-resize rounded-sm border-2 border-white bg-blue-600 shadow"
        />
      )}
    </div>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>
          {value}
          {step < 1 ? "" : "%"}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={values => onChange(values[0] ?? value)}
      />
    </div>
  );
}

export default function CustomerUiBuilder() {
  const [, setLocation] = useLocation();
  const selectedContactId =
    Number(new URLSearchParams(window.location.search).get("contact")) || 0;
  const contactsQuery = trpc.contacts.list.useQuery(undefined, {
    refetchInterval: 10_000,
  });
  const editorQuery = trpc.customerUi.editor.useQuery(
    { contactId: selectedContactId },
    { enabled: selectedContactId > 0 }
  );
  const [document, setDocument] = useState<CustomerUiDocument>(
    defaultCustomerUiDocument
  );
  const [selectedId, setSelectedId] = useState<string>(
    defaultCustomerUiDocument.components[0]?.id ?? ""
  );
  const [history, setHistory] = useState<CustomerUiDocument[]>([]);
  const [future, setFuture] = useState<CustomerUiDocument[]>([]);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("mobile");
  const [drag, setDrag] = useState<DragState>(null);
  const [templateName, setTemplateName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorLoadedKey = `${editorQuery.data?.config.id ?? "none"}:${editorQuery.data?.config.updatedAt?.toString() ?? ""}`;

  const selected = document.components.find(item => item.id === selectedId);
  const contentHeight = document.canvas.contentHeight ?? 100;
  const utils = trpc.useUtils();
  const saveDraft = trpc.customerUi.saveDraft.useMutation({
    onSuccess: () => {
      void editorQuery.refetch();
      toast.success("حُفظت المسودة في سجل الإصدارات.");
    },
    onError: error => toast.error(error.message),
  });
  const publish = trpc.customerUi.publish.useMutation({
    onSuccess: () => {
      void editorQuery.refetch();
      toast.success("نُشرت الواجهة للعميل وأُرسل إشعار داخل التطبيق.");
    },
    onError: error => toast.error(error.message),
  });
  const restore = trpc.customerUi.restore.useMutation({
    onSuccess: result => {
      try {
        setDocument(JSON.parse(result.config.draftDocument));
      } catch {
        /* ignored */
      }
      void editorQuery.refetch();
      toast.success("استُعيدت النسخة إلى مسودة قابلة للمراجعة.");
    },
  });
  const saveTemplate = trpc.customerUi.saveTemplate.useMutation({
    onSuccess: () => {
      setTemplateName("");
      void editorQuery.refetch();
      toast.success("حُفظ التصميم كقالب قابل لإعادة الاستخدام.");
    },
  });
  const applyTemplate = trpc.customerUi.applyTemplate.useMutation({
    onSuccess: result => {
      try {
        setDocument(JSON.parse(result.config.draftDocument));
      } catch {
        /* ignored */
      }
      void editorQuery.refetch();
      toast.success("طُبق القالب كمسودة لهذا العميل.");
    },
  });
  const removeTemplate = trpc.customerUi.removeTemplate.useMutation({
    onSuccess: () => void editorQuery.refetch(),
  });
  const beginImageUpload = trpc.customerUi.beginImageUpload.useMutation();
  const appendImageChunk = trpc.customerUi.appendImageChunk.useMutation();
  const finishImageUpload = trpc.customerUi.finishImageUpload.useMutation();

  useEffect(() => {
    if (!editorQuery.data) return;
    try {
      const parsed = JSON.parse(
        editorQuery.data.config.draftDocument
      ) as CustomerUiDocument;
      setDocument({
        ...parsed,
        canvas: {
          ...parsed.canvas,
          contentHeight: parsed.canvas.contentHeight ?? 100,
        },
      });
      setSelectedId(parsed.components[0]?.id ?? "");
      setHistory([]);
      setFuture([]);
    } catch {
      setDocument(defaultCustomerUiDocument);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorLoadedKey]);

  const mutateDocument = (next: CustomerUiDocument) => {
    setHistory(items => [...items.slice(-24), document]);
    setFuture([]);
    setDocument(next);
  };
  const updateSelected = (changes: Partial<CustomerUiComponent>) => {
    if (!selected) return;
    mutateDocument({
      ...document,
      components: document.components.map(component =>
        component.id === selected.id ? { ...component, ...changes } : component
      ),
    });
  };
  const updateSelectedStyle = (
    changes: Partial<CustomerUiComponent["style"]>
  ) => {
    if (!selected) return;
    updateSelected({ style: { ...selected.style, ...changes } });
  };
  const addComponent = (type: CustomerUiComponentType) => {
    const lastBottom = document.components.reduce(
      (max, component) => Math.max(max, component.y + component.height),
      0
    );
    const y = Math.max(6, lastBottom + 5);
    const next = nextComponent(type, document.components.length, y);
    mutateDocument({
      ...document,
      canvas: {
        ...document.canvas,
        contentHeight: Math.min(
          500,
          Math.max(contentHeight, y + next.height + 12)
        ),
      },
      components: [...document.components, next],
    });
    setSelectedId(next.id);
  };
  const addSpaceBelow = () => {
    const y = Math.max(
      contentHeight + 6,
      document.components.reduce(
        (max, component) => Math.max(max, component.y + component.height + 6),
        0
      )
    );
    const next = nextComponent("spacer", document.components.length, y);
    mutateDocument({
      ...document,
      canvas: { ...document.canvas, contentHeight: Math.min(500, y + 35) },
      components: [...document.components, next],
    });
    setSelectedId(next.id);
  };
  const removeSelected = () => {
    if (!selected || selected.locked) return;
    mutateDocument({
      ...document,
      components: document.components.filter(
        component => component.id !== selected.id
      ),
    });
    setSelectedId(
      document.components.find(component => component.id !== selected.id)?.id ??
        ""
    );
  };
  const duplicateSelected = () => {
    if (!selected) return;
    const copy = {
      ...selected,
      id: `${selected.type}-${Date.now()}`,
      label: `${selected.label} (نسخة)`,
      x: Math.min(92 - selected.width, selected.x + 4),
      y: Math.min(500 - selected.height, selected.y + selected.height + 4),
    };
    mutateDocument({
      ...document,
      canvas: {
        ...document.canvas,
        contentHeight: Math.min(
          500,
          Math.max(contentHeight, copy.y + copy.height + 12)
        ),
      },
      components: [...document.components, copy],
    });
    setSelectedId(copy.id);
  };
  const moveLayer = (direction: -1 | 1) => {
    if (!selected) return;
    const index = document.components.findIndex(
      component => component.id === selected.id
    );
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= document.components.length) return;
    const components = [...document.components];
    [components[index], components[nextIndex]] = [
      components[nextIndex],
      components[index],
    ];
    mutateDocument({ ...document, components });
  };
  const chooseContact = (contactId: number) =>
    setLocation(`/dashboard/customer-ui?contact=${contactId}`);

  useEffect(() => {
    if (!drag) return;
    const onMove = (event: PointerEvent) => {
      const dx = ((event.clientX - drag.startX) / drag.rect.width) * 100;
      const dy =
        ((event.clientY - drag.startY) / drag.rect.height) * contentHeight;
      const component = document.components.find(item => item.id === drag.id);
      if (!component) return;
      const next =
        drag.mode === "move"
          ? {
              ...component,
              x: Math.min(
                100 - component.width,
                Math.max(0, Math.round(drag.initial.x + dx))
              ),
              y: Math.min(
                500 - component.height,
                Math.max(0, Math.round(drag.initial.y + dy))
              ),
            }
          : {
              ...component,
              width: Math.min(
                100 - component.x,
                Math.max(8, Math.round(drag.initial.width - dx))
              ),
              height: Math.min(
                100,
                Math.max(4, Math.round(drag.initial.height + dy))
              ),
            };
      setDocument(current => ({
        ...current,
        canvas: {
          ...current.canvas,
          contentHeight: Math.min(
            500,
            Math.max(
              current.canvas.contentHeight ?? 100,
              next.y + next.height + 12
            )
          ),
        },
        components: current.components.map(item =>
          item.id === next.id ? next : item
        ),
      }));
    };
    const onUp = () => {
      setHistory(items => [...items.slice(-24), drag.initialDocument]);
      setFuture([]);
      setDrag(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [contentHeight, document, drag]);

  const onComponentPointerDown = (
    component: CustomerUiComponent,
    event: ReactPointerEvent<HTMLElement>,
    mode: "move" | "resize"
  ) => {
    if (component.locked || !canvasRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(component.id);
    setDrag({
      id: component.id,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initial: component,
      initialDocument: document,
      rect: canvasRef.current.getBoundingClientRect(),
    });
  };
  const toBase64Url = async (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve(
          String(reader.result)
            .split(",")[1]
            ?.replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "") ?? ""
        );
      reader.onerror = () => reject(new Error("تعذر قراءة الصورة."));
      reader.readAsDataURL(file);
    });
  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !selected || selected.type !== "image") return;
    if (files.some(file => !file.type.startsWith("image/")))
      return toast.error("اختر ملفات صور من المعرض فقط.");
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const encoded = await toBase64Url(file);
        const chunkSize = 22_000;
        const totalChunks = Math.ceil(encoded.length / chunkSize);
        const begin = await beginImageUpload.mutateAsync({
          fileName: file.name,
          mimeType: file.type,
          size: file.size,
          totalChunks,
        });
        for (let index = 0; index < totalChunks; index += 1)
          await appendImageChunk.mutateAsync({
            uploadId: begin.uploadId,
            index,
            data: encoded
              .slice(index * chunkSize, (index + 1) * chunkSize)
              .split("")
              .reverse()
              .join(""),
          });
        const uploaded = await finishImageUpload.mutateAsync({
          uploadId: begin.uploadId,
        });
        uploadedUrls.push(uploaded.url);
      }
      const firstUrl = uploadedUrls[0];
      const baseY = Math.max(
        6,
        document.components.reduce(
          (max, component) => Math.max(max, component.y + component.height + 5),
          0
        )
      );
      const extraImages = uploadedUrls.slice(1).map((url, index) => ({
        ...nextComponent(
          "image",
          document.components.length + index,
          baseY + index * 34
        ),
        content: url,
        label: `صورة المعرض ${index + 2}`,
      }));
      const nextDocument: CustomerUiDocument = {
        ...document,
        canvas: {
          ...document.canvas,
          contentHeight: Math.min(
            500,
            Math.max(
              contentHeight,
              selected.y + selected.height + 12,
              ...extraImages.map(image => image.y + image.height + 12)
            )
          ),
        },
        components: document.components
          .map(component =>
            component.id === selected.id
              ? { ...component, content: firstUrl }
              : component
          )
          .concat(extraImages),
      };
      mutateDocument(nextDocument);
      if (extraImages.length)
        setSelectedId(extraImages[extraImages.length - 1].id);
      toast.success(
        uploadedUrls.length === 1
          ? "أضيفت الصورة إلى العنصر المحدد."
          : `أضيفت ${uploadedUrls.length} صور من المعرض.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر رفع الصور.");
    }
  };
  const busy =
    saveDraft.isPending ||
    publish.isPending ||
    restore.isPending ||
    applyTemplate.isPending ||
    beginImageUpload.isPending ||
    appendImageChunk.isPending ||
    finishImageUpload.isPending;
  const activity = editorQuery.data?.activity ?? [];
  const textLike =
    selected &&
    ![
      "image",
      "divider",
      "spacer",
      "status",
      "profile",
      "application",
    ].includes(selected.type);

  return (
    <main className="mx-auto max-w-[1800px] space-y-5" dir="rtl">
      <header className="flex flex-col gap-4 rounded-[2rem] bg-gradient-to-l from-indigo-800 via-blue-700 to-blue-500 px-6 py-6 text-white shadow-xl shadow-blue-100 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div>
          <p className="text-xs font-bold tracking-[.18em] text-blue-100">
            CUSTOMER UI BUILDER
          </p>
          <h1 className="mt-2 text-2xl font-extrabold">
            غرفة تخصيص واجهة العميل
          </h1>
          <p className="mt-1 text-sm text-blue-100">
            صمّم من الجانبين، عاين على الهاتف في الوسط، ثم انشر التحديث بعد
            مراجعته.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => {
              if (history.length) {
                const previous = history[history.length - 1];
                setFuture(items => [document, ...items]);
                setHistory(items => items.slice(0, -1));
                setDocument(previous);
              }
            }}
            disabled={!history.length || busy}
            variant="secondary"
            className="rounded-xl"
          >
            <Undo2 className="ml-2 size-4" />
            تراجع
          </Button>
          <Button
            onClick={() => {
              if (future.length) {
                const next = future[0];
                setHistory(items => [...items, document]);
                setFuture(items => items.slice(1));
                setDocument(next);
              }
            }}
            disabled={!future.length || busy}
            variant="secondary"
            className="rounded-xl"
          >
            <Redo2 className="ml-2 size-4" />
            إعادة
          </Button>
          {selectedContactId > 0 && (
            <>
              <Button
                onClick={() =>
                  saveDraft.mutate({
                    contactId: selectedContactId,
                    document,
                    summary: "حفظ مسودة من المحرر الأفقي",
                  })
                }
                disabled={busy}
                variant="secondary"
                className="rounded-xl"
              >
                <Save className="ml-2 size-4" />
                حفظ مسودة
              </Button>
              <Button
                onClick={() =>
                  publish.mutate({
                    contactId: selectedContactId,
                    document,
                    summary: "نشر تحديث من المحرر الأفقي",
                  })
                }
                disabled={busy}
                className="rounded-xl bg-emerald-500 hover:bg-emerald-600"
              >
                <UploadCloud className="ml-2 size-4" />
                نشر التحديث
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="customer-ui-workspace grid min-h-[760px] gap-4 lg:grid-cols-[250px_minmax(420px,1fr)_300px]">
        <aside className="order-2 max-h-[820px] overflow-y-auto rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:order-1 lg:self-start">
          <div className="mb-4 flex items-center gap-2">
            <UsersRound className="size-5 text-blue-600" />
            <h2 className="font-extrabold text-slate-900">العملاء والعناصر</h2>
          </div>
          <div className="mb-4 flex items-center gap-1 rounded-xl bg-slate-50 p-1" aria-label="أدوات الجانب الأيسر">
            <button type="button" title="مكتبة العناصر" onClick={() => window.document.getElementById("customer-ui-elements")?.scrollIntoView({ block: "nearest" })} className="flex flex-1 items-center justify-center rounded-lg bg-white px-2 py-2 text-blue-700 shadow-sm"><Blocks className="size-4" /><span className="mr-1 text-[10px] font-bold">العناصر</span></button>
            <button type="button" title="الطبقات" onClick={() => window.document.getElementById("customer-ui-layers")?.scrollIntoView({ block: "nearest" })} className="flex flex-1 items-center justify-center rounded-lg px-2 py-2 text-slate-500 hover:bg-white"><Layers3 className="size-4" /><span className="mr-1 text-[10px] font-bold">الطبقات</span></button>
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-2xl bg-slate-50 p-2">
            {contactsQuery.data?.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => chooseContact(contact.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-sm transition ${selectedContactId === contact.id ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-white"}`}
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-xs font-bold">
                  {contact.displayName.slice(0, 1)}
                </span>
                <span className="truncate">{contact.displayName}</span>
              </button>
            ))}
          </div>
          <div className="my-5 border-t border-slate-100" />
          <div id="customer-ui-elements" className="mb-3 flex items-center gap-2">
            <Blocks className="size-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">مكتبة العناصر</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {componentLibrary.map(item => (
              <button
                key={item.type}
                type="button"
                onClick={() => addComponent(item.type)}
                disabled={!selectedContactId}
                className="flex flex-col items-start gap-2 rounded-xl border border-slate-100 p-3 text-right transition hover:border-blue-300 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-lg ${item.color}`}
                >
                  <item.icon className="size-4" />
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={addSpaceBelow}
            disabled={!selectedContactId}
            className="mt-4 w-full rounded-xl border-dashed text-xs"
          >
            <Plus className="ml-2 size-4" />
            إضافة مساحة ومحتوى إلى الأسفل
          </Button>
          <div className="my-5 border-t border-slate-100" />
          <div id="customer-ui-layers" className="flex items-center gap-2">
            <Layers3 className="size-5 text-blue-600" />
            <h3 className="font-bold text-slate-800">الطبقات</h3>
          </div>
          <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
            {[...document.components].reverse().map(component => (
              <button
                key={component.id}
                type="button"
                onClick={() => setSelectedId(component.id)}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-right text-xs ${selectedId === component.id ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span
                  className={`size-2 rounded-full ${component.visible ? "bg-emerald-500" : "bg-slate-300"}`}
                />
                <span className="truncate">{component.label}</span>
                <span className="mr-auto text-[10px] text-slate-400">
                  {typeLabels[component.type]}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="order-1 min-w-0 rounded-[1.6rem] border border-slate-200 bg-slate-100/70 p-4 shadow-sm lg:sticky lg:top-4 lg:order-2 lg:self-start">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-extrabold text-slate-900">
                {editorQuery.data
                  ? `تصميم ${editorQuery.data.contact.displayName}`
                  : "اختر عميلاً للبدء"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                اسحب العنصر وعدّل حجمه؛ يمكن أن يمتد التصميم لأسفل بلا حد بصري
                حتى 500 وحدة.
              </p>
              {editorQuery.data && (
                <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-cyan-700">
                  <UserRound className="size-3.5" />
                  {editorQuery.data.contact.displayName}
                  {editorQuery.data.contact.phone && (
                    <span>· {editorQuery.data.contact.phone}</span>
                  )}
                  {editorQuery.data.request && (
                    <span>
                      ·{" "}
                      {requestStatusLabels[editorQuery.data.request.status] ??
                        editorQuery.data.request.status}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex rounded-xl bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setPreviewMode("mobile")}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${previewMode === "mobile" ? "bg-blue-600 text-white" : "text-slate-500"}`}
              >
                <Smartphone className="size-3.5" />
                هاتف
              </button>
              <button
                type="button"
                onClick={() => setPreviewMode("desktop")}
                className={`flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold ${previewMode === "desktop" ? "bg-blue-600 text-white" : "text-slate-500"}`}
              >
                <Monitor className="size-3.5" />
                سطح المكتب
              </button>
            </div>
          </div>
          {selectedContactId === 0 ? (
            <div className="flex min-h-[590px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-blue-200 bg-white text-center">
              <PanelRight className="mb-3 size-10 text-blue-300" />
              <h3 className="font-bold text-slate-800">
                اختر عميلاً من القائمة
              </h3>
            </div>
          ) : editorQuery.isLoading ? (
            <div className="flex min-h-[590px] items-center justify-center">
              <Loader2 className="size-7 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="flex h-[690px] justify-center overflow-y-auto rounded-[2rem] border border-slate-200 bg-[linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%),linear-gradient(45deg,#e2e8f0_25%,transparent_25%,transparent_75%,#e2e8f0_75%)] bg-[size:20px_20px] bg-[position:0_0,10px_10px] p-5">
              <div
                ref={canvasRef}
                onClick={() => setSelectedId("")}
                className={`relative shrink-0 overflow-hidden bg-white shadow-2xl ${previewMode === "mobile" ? "w-full max-w-[330px] rounded-[2.3rem] border-[8px] border-slate-900" : "w-full max-w-[800px] rounded-2xl border border-slate-300"}`}
                style={{
                  height: `${Math.max(previewMode === "mobile" ? 620 : 460, contentHeight * (previewMode === "mobile" ? 5.4 : 3.4))}px`,
                  background: document.canvas.background,
                }}
              >
                {previewMode === "mobile" && (
                  <div className="sticky top-0 z-20 flex items-center justify-between bg-[#075e54] px-4 py-3 text-[10px] text-white">
                    <span>مراسلة المؤسسة</span>
                    <span>واجهة مخصصة</span>
                  </div>
                )}
                <div
                  className="pointer-events-none absolute inset-0 z-0 opacity-20"
                  style={{
                    backgroundImage:
                      "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
                    backgroundSize: "10% 10%",
                  }}
                />
                {document.components.map(component => (
                  <ComponentRender
                    key={component.id}
                    component={component}
                    contentHeight={contentHeight}
                    selected={selectedId === component.id}
                    onSelect={() => setSelectedId(component.id)}
                    onPointerDown={(event, mode) =>
                      onComponentPointerDown(component, event, mode)
                    }
                    profile={editorQuery.data?.contact}
                    request={editorQuery.data?.request}
                  />
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="order-3 max-h-[820px] overflow-y-auto rounded-[1.6rem] border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:order-3 lg:self-start">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="size-5 text-blue-600" />
              <h2 className="font-extrabold text-slate-900">خصائص العنصر</h2>
            </div>
            <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1" aria-label="اختصارات خصائص العنصر">
              <button type="button" title="النص" onClick={() => window.document.getElementById("customer-ui-text-properties")?.scrollIntoView({ block: "nearest" })} className="rounded-md p-1.5 text-blue-700 hover:bg-white"><Type className="size-3.5" /></button>
              <button type="button" title="الصورة" onClick={() => window.document.getElementById("customer-ui-image-properties")?.scrollIntoView({ block: "nearest" })} className="rounded-md p-1.5 text-violet-700 hover:bg-white"><Image className="size-3.5" /></button>
              <button type="button" title="الإجراء" onClick={() => window.document.getElementById("customer-ui-action-properties")?.scrollIntoView({ block: "nearest" })} className="rounded-md p-1.5 text-indigo-700 hover:bg-white"><Link2 className="size-3.5" /></button>
              <button type="button" title="المظهر" onClick={() => window.document.getElementById("customer-ui-style-properties")?.scrollIntoView({ block: "nearest" })} className="rounded-md p-1.5 text-slate-700 hover:bg-white"><Paintbrush className="size-3.5" /></button>
            </div>
            {selected && (
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={duplicateSelected}
                  className="size-8"
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={removeSelected}
                  className="size-8 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )}
          </div>
          {!selected ? (
            <div className="flex min-h-64 flex-col items-center justify-center text-center text-sm text-slate-400">
              <MousePointer2 className="mb-3 size-7" />
              حدد عنصراً من الهاتف أو الطبقات لعرض أدواته الخاصة.
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                {typeLabels[selected.type]} · {selected.label}
              </div>
              <div className="space-y-2">
                <Label>اسم الطبقة</Label>
                <Input
                  value={selected.label}
                  onChange={event =>
                    updateSelected({ label: event.target.value })
                  }
                  className="h-9 rounded-xl text-right"
                />
              </div>
              {textLike && (
                <section id="customer-ui-text-properties" className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-blue-900">
                    <Type className="size-4" />
                    تحرير النص والخط
                  </div>
                  <Textarea
                    value={selected.content ?? ""}
                    onChange={event =>
                      updateSelected({ content: event.target.value })
                    }
                    className="min-h-24 rounded-xl text-right"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>الخط</Label>
                      <select
                        value={selected.style.fontFamily ?? "modern"}
                        onChange={event =>
                          updateSelectedStyle({
                            fontFamily: event.target.value as
                              | "modern"
                              | "classic"
                              | "bold"
                              | "rounded",
                          })
                        }
                        className="mt-1 h-9 w-full rounded-xl border border-slate-200 bg-white px-2 text-xs"
                      >
                        <option value="modern">عصري</option>
                        <option value="classic">كلاسيكي</option>
                        <option value="bold">عريض</option>
                        <option value="rounded">مستدير</option>
                      </select>
                    </div>
                    <div>
                      <Label>الحجم</Label>
                      <Input
                        type="number"
                        value={selected.style.fontSize ?? 14}
                        min={10}
                        max={40}
                        onChange={event =>
                          updateSelectedStyle({
                            fontSize: Number(event.target.value),
                          })
                        }
                        className="mt-1 h-9"
                      />
                    </div>
                  </div>
                  <RangeField
                    label="تباعد الحروف"
                    value={selected.style.letterSpacing ?? 0}
                    min={-1}
                    max={8}
                    step={0.5}
                    onChange={value =>
                      updateSelectedStyle({ letterSpacing: value })
                    }
                  />
                  <RangeField
                    label="تباعد السطور"
                    value={selected.style.lineHeight ?? 1.5}
                    min={1}
                    max={2.4}
                    step={0.1}
                    onChange={value =>
                      updateSelectedStyle({ lineHeight: value })
                    }
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedStyle({ textAlign: "right" })
                      }
                      className={`rounded-lg border p-2 ${selected.style.textAlign === "right" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200"}`}
                    >
                      <AlignRight className="mx-auto size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateSelectedStyle({ textAlign: "center" })
                      }
                      className={`rounded-lg border p-2 ${selected.style.textAlign === "center" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200"}`}
                    >
                      <AlignCenter className="mx-auto size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedStyle({ textAlign: "left" })}
                      className={`rounded-lg border p-2 ${selected.style.textAlign === "left" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-slate-200"}`}
                    >
                      <AlignLeft className="mx-auto size-4" />
                    </button>
                  </div>
                </section>
              )}
              {selected.type === "image" && (
                <section id="customer-ui-image-properties" className="space-y-3 rounded-2xl border border-violet-100 bg-violet-50/40 p-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-violet-900">
                    <Crop className="size-4" />
                    الصورة والقص والوضع
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={uploadImage}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="w-full rounded-xl border-violet-200 bg-white"
                  >
                    <UploadCloud className="ml-2 size-4" />
                    اختيار صورة من المعرض
                  </Button>
                  <div className="overflow-hidden rounded-xl border border-violet-100 bg-white">
                    <img
                      src={selected.content}
                      alt="معاينة العنصر"
                      className="h-28 w-full"
                      style={{
                        objectFit: selected.style.objectFit,
                        objectPosition: `${selected.style.objectPositionX ?? 50}% ${selected.style.objectPositionY ?? 50}%`,
                        filter:
                          filterCss[selected.style.filterPreset ?? "none"],
                        transform: `scale(${selected.style.imageScale ?? 1})`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSelectedStyle({ objectFit: "cover" })
                      }
                      className={`rounded-lg ${selected.style.objectFit === "cover" ? "border-violet-500 text-violet-700" : ""}`}
                    >
                      قص لتعبئة الإطار
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateSelectedStyle({ objectFit: "contain" })
                      }
                      className={`rounded-lg ${selected.style.objectFit === "contain" ? "border-violet-500 text-violet-700" : ""}`}
                    >
                      إظهار الصورة كاملة
                    </Button>
                  </div>
                  <RangeField
                    label="موضع القص أفقي"
                    value={selected.style.objectPositionX ?? 50}
                    min={0}
                    max={100}
                    onChange={value =>
                      updateSelectedStyle({ objectPositionX: value })
                    }
                  />
                  <RangeField
                    label="موضع القص عمودي"
                    value={selected.style.objectPositionY ?? 50}
                    min={0}
                    max={100}
                    onChange={value =>
                      updateSelectedStyle({ objectPositionY: value })
                    }
                  />
                  <RangeField
                    label="تكبير الصورة"
                    value={selected.style.imageScale ?? 1}
                    min={1}
                    max={3}
                    step={0.1}
                    onChange={value =>
                      updateSelectedStyle({ imageScale: value })
                    }
                  />
                  <div>
                    <Label>المرشح</Label>
                    <select
                      value={selected.style.filterPreset ?? "none"}
                      onChange={event =>
                        updateSelectedStyle({
                          filterPreset: event.target.value as
                            | "none"
                            | "warm"
                            | "cool"
                            | "mono"
                            | "vivid"
                            | "soft",
                        })
                      }
                      className="mt-1 h-9 w-full rounded-xl border border-violet-200 bg-white px-2 text-xs"
                    >
                      <option value="none">طبيعي</option>
                      <option value="warm">دافئ</option>
                      <option value="cool">بارد</option>
                      <option value="mono">أبيض وأسود</option>
                      <option value="vivid">حيوي</option>
                      <option value="soft">ناعم</option>
                    </select>
                  </div>
                </section>
              )}
              {selected.type === "profile" && (
                <section className="space-y-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-cyan-950">
                    <UserRound className="size-4" />
                    بيانات العميل الظاهرة له
                  </div>
                  <p className="text-xs leading-5 text-cyan-800">
                    تُملأ البطاقة تلقائياً من ملف العميل المحدد، ولا تنسخ
                    بياناته داخل التصميم.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["name", "phone", "email"] as const).map(field => {
                      const fields = selected.profileFields ?? [
                        "name",
                        "phone",
                        "email",
                      ];
                      const active = fields.includes(field);
                      const label =
                        field === "name"
                          ? "الاسم"
                          : field === "phone"
                            ? "رقم الهاتف"
                            : "البريد الإلكتروني";
                      return (
                        <Button
                          key={field}
                          type="button"
                          size="sm"
                          variant={active ? "default" : "outline"}
                          onClick={() => {
                            const next = active
                              ? fields.filter(item => item !== field)
                              : [...fields, field];
                            if (next.length)
                              updateSelected({ profileFields: next });
                          }}
                          className={
                            active
                              ? "rounded-lg bg-cyan-700 hover:bg-cyan-800"
                              : "rounded-lg"
                          }
                        >
                          {label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="rounded-xl bg-white/80 p-2 text-xs text-cyan-900">
                    معاينة:{" "}
                    {editorQuery.data?.contact.displayName ?? "اسم العميل"}
                  </div>
                </section>
              )}
              {selected.type === "application" && (
                <section className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
                  <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-950">
                    <BadgeCheck className="size-4" />
                    بطاقة حالة القبول والمتابعة
                  </div>
                  <p className="text-xs leading-5 text-emerald-800">
                    تعرض البطاقة حالة الطلب الفعلية للعميل، وتنتقل به إلى صفحة
                    القبول عند الضغط عليها.
                  </p>
                  <div className="rounded-xl bg-white/80 p-3 text-xs text-emerald-900">
                    {editorQuery.data?.request
                      ? `${requestStatusLabels[editorQuery.data.request.status] ?? editorQuery.data.request.status} · ${editorQuery.data.request.requestNumber}`
                      : "لا يوجد طلب مرتبط بهذا العميل حالياً."}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSelected({ action: { type: "application" } })
                    }
                    className="rounded-lg border-emerald-200"
                  >
                    ربط بصفحة القبول
                  </Button>
                </section>
              )}
              {selected.type === "status" && (
                <section className="space-y-2 rounded-xl bg-emerald-50 p-3">
                  <Label className="text-emerald-900">مراحل حالة الطلب</Label>
                  {selected.statusSteps?.map((step, index) => (
                    <div key={step.id} className="flex gap-2">
                      <span
                        className="flex size-8 items-center justify-center rounded-lg text-xs text-white"
                        style={{ background: step.color }}
                      >
                        {index + 1}
                      </span>
                      <Input
                        value={step.label}
                        onChange={event =>
                          updateSelected({
                            statusSteps: selected.statusSteps?.map(item =>
                              item.id === step.id
                                ? { ...item, label: event.target.value }
                                : item
                            ),
                          })
                        }
                        className="h-8"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          updateSelected({
                            statusSteps: selected.statusSteps?.filter(
                              item => item.id !== step.id
                            ),
                          })
                        }
                        className="size-8 text-rose-500"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSelected({
                        statusSteps: [
                          ...(selected.statusSteps ?? []),
                          {
                            id: `step-${Date.now()}`,
                            label: "مرحلة جديدة",
                            color: "#2563eb",
                          },
                        ],
                      })
                    }
                    className="rounded-lg text-xs"
                  >
                    <Plus className="ml-1 size-3" />
                    مرحلة
                  </Button>
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    {(selected.statusSteps ?? []).map((step, index) => (
                      <Button
                        key={step.id}
                        type="button"
                        size="sm"
                        variant={
                          selected.statusCurrent === index
                            ? "default"
                            : "outline"
                        }
                        onClick={() => updateSelected({ statusCurrent: index })}
                        className={
                          selected.statusCurrent === index
                            ? "h-8 rounded-lg bg-emerald-600 px-1 text-[10px] hover:bg-emerald-700"
                            : "h-8 rounded-lg px-1 text-[10px]"
                        }
                      >
                        {index + 1}
                      </Button>
                    ))}
                  </div>
                </section>
              )}
              <section id="customer-ui-action-properties" className="space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-indigo-900">
                  <Link2 className="size-4" />
                  إجراء العنصر
                </div>
                <select
                  value={selected.action.type}
                  onChange={event =>
                    updateSelected({
                      action: {
                        type: event.target
                          .value as CustomerUiComponent["action"]["type"],
                        value: selected.action.value,
                      },
                    })
                  }
                  className="h-9 w-full rounded-xl border border-indigo-200 bg-white px-2 text-xs"
                >
                  <option value="none">لا يوجد إجراء</option>
                  <option value="chat">فتح خدمة العملاء</option>
                  <option value="institution">فتح صفحة المؤسسة</option>
                  <option value="application">فتح صفحة القبول</option>
                  <option value="profile">فتح الملف الشخصي</option>
                  <option value="url">فتح رابط خارجي</option>
                </select>
                {selected.action.type === "url" && (
                  <Input
                    value={selected.action.value ?? ""}
                    onChange={event =>
                      updateSelected({
                        action: { type: "url", value: event.target.value },
                      })
                    }
                    placeholder="https://example.com"
                    className="h-9 rounded-xl text-left"
                    dir="ltr"
                  />
                )}
              </section>
              <section id="customer-ui-style-properties" className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                  <Move className="size-4" />
                  الموضع والمظهر
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>لون النص</Label>
                    <Input
                      type="color"
                      value={selected.style.color ?? "#0f172a"}
                      onChange={event =>
                        updateSelectedStyle({ color: event.target.value })
                      }
                      className="h-9 w-full p-1"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>الخلفية</Label>
                    <Input
                      type="color"
                      value={selected.style.background ?? "#ffffff"}
                      onChange={event =>
                        updateSelectedStyle({ background: event.target.value })
                      }
                      className="h-9 w-full p-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RangeField
                    label="العرض"
                    value={selected.width}
                    min={8}
                    max={100 - selected.x}
                    onChange={value => updateSelected({ width: value })}
                  />
                  <RangeField
                    label="الارتفاع"
                    value={selected.height}
                    min={4}
                    max={100}
                    onChange={value => updateSelected({ height: value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RangeField
                    label="موضع أفقي"
                    value={selected.x}
                    min={0}
                    max={100 - selected.width}
                    onChange={value => updateSelected({ x: value })}
                  />
                  <RangeField
                    label="موضع رأسي"
                    value={selected.y}
                    min={0}
                    max={500 - selected.height}
                    onChange={value => updateSelected({ y: value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RangeField
                    label="الاستدارة"
                    value={selected.style.borderRadius ?? 0}
                    min={0}
                    max={48}
                    onChange={value =>
                      updateSelectedStyle({ borderRadius: value })
                    }
                  />
                  <RangeField
                    label="المسافة الداخلية"
                    value={selected.style.padding ?? 0}
                    min={0}
                    max={48}
                    onChange={value => updateSelectedStyle({ padding: value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <RangeField
                    label="الشفافية"
                    value={Math.round((selected.style.opacity ?? 1) * 100)}
                    min={10}
                    max={100}
                    onChange={value =>
                      updateSelectedStyle({ opacity: value / 100 })
                    }
                  />
                  <RangeField
                    label="سماكة الحد"
                    value={selected.style.borderWidth ?? 0}
                    min={0}
                    max={12}
                    onChange={value =>
                      updateSelectedStyle({ borderWidth: value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveLayer(1)}
                    className="rounded-lg"
                  >
                    <ChevronUp className="ml-1 size-3.5" />
                    للأمام
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveLayer(-1)}
                    className="rounded-lg"
                  >
                    <ChevronDown className="ml-1 size-3.5" />
                    للخلف
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      updateSelected({ visible: !selected.visible })
                    }
                    className="mr-auto rounded-lg"
                  >
                    <Eye className="ml-1 size-3.5" />
                    {selected.visible ? "ظاهر" : "مخفي"}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateSelectedStyle({ shadow: !selected.style.shadow })
                    }
                    className={`rounded-lg ${selected.style.shadow ? "border-slate-700 bg-slate-200 text-slate-900" : ""}`}
                  >
                    ظل البطاقة
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => updateSelected({ locked: !selected.locked })}
                    className="rounded-lg"
                  >
                    {selected.locked ? (
                      <UnlockKeyhole className="ml-1 size-3.5" />
                    ) : (
                      <LockKeyhole className="ml-1 size-3.5" />
                    )}
                    {selected.locked ? "إلغاء القفل" : "قفل الموضع"}
                  </Button>
                </div>
              </section>
            </div>
          )}
        </aside>
      </div>
      {selectedContactId > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="size-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">القوالب والإصدارات</h2>
          </div>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div>
              <div className="flex gap-2">
                <Input
                  value={templateName}
                  onChange={event => setTemplateName(event.target.value)}
                  placeholder="اسم القالب"
                  className="h-9 rounded-xl text-xs"
                />
                <Button
                  size="sm"
                  onClick={() =>
                    templateName.trim() &&
                    saveTemplate.mutate({ name: templateName.trim(), document })
                  }
                  disabled={!templateName.trim()}
                  className="rounded-xl bg-blue-600"
                >
                  <Save className="size-3.5" />
                </Button>
              </div>
              <div className="mt-3 max-h-28 space-y-1 overflow-y-auto">
                {editorQuery.data?.templates.map(template => (
                  <div
                    key={template.id}
                    className="flex items-center gap-1 rounded-lg bg-slate-50 p-1"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        selectedContactId &&
                        applyTemplate.mutate({
                          contactId: selectedContactId,
                          templateId: template.id,
                        })
                      }
                      className="min-w-0 flex-1 truncate px-2 py-1 text-right text-xs text-slate-700"
                    >
                      {template.name}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeTemplate.mutate({ id: template.id })}
                      className="size-7 text-rose-500"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {editorQuery.data?.revisions.map(revision => (
                <button
                  key={revision.id}
                  type="button"
                  onClick={() =>
                    selectedContactId &&
                    restore.mutate({
                      contactId: selectedContactId,
                      revisionId: revision.id,
                    })
                  }
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-right text-xs hover:bg-blue-50"
                >
                  <History className="size-3.5 text-blue-500" />
                  <span className="font-bold">v{revision.version}</span>
                  <span className="truncate text-slate-500">
                    {revision.changeSummary}
                  </span>
                  <span
                    className={`mr-auto rounded px-1.5 py-0.5 text-[10px] ${revision.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                  >
                    {revision.status === "published" ? "منشورة" : "مسودة"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
      {selectedContactId > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <History className="size-5 text-blue-600" />
            <h2 className="font-bold text-slate-800">سجل التحديثات</h2>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            {activity.length ? (
              activity.slice(0, 6).map(item => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-3">
                  <p className="text-sm font-bold text-slate-700">
                    {item.summary}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleString("ar-EG")}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">
                سيظهر هنا تاريخ الحفظ والنشر واستعادة النسخ.
              </p>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
