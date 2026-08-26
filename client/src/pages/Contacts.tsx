import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { getCustomerChatPath } from "@/lib/customerChat";
import {
  Clock3,
  ClipboardCheck,
  FilePenLine,
  Loader2,
  MessageCircle,
  Paintbrush,
  PhoneCall,
  Search,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
const chatStatus = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  closed: "مغلقة",
};
const requestStatus = {
  new: "جديد",
  in_progress: "قيد المعالجة",
  waiting: "قيد الانتظار",
  completed: "مكتمل",
  closed: "مغلق",
};

function CustomerAvatar({
  name,
  src,
  size = "size-11",
}: {
  name: string;
  src?: string | null;
  size?: string;
}) {
  return src ? (
    <img
      src={src}
      alt={name}
      className={`${size} shrink-0 rounded-2xl object-cover`}
    />
  ) : (
    <span
      className={`flex ${size} shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700`}
    >
      <UserRound className="size-4" />
    </span>
  );
}

export default function Contacts() {
  const [location, setLocation] = useLocation();
  const selectedFromUrl =
    Number(new URLSearchParams(window.location.search).get("contact")) || null;
  const [selectedId, setSelectedId] = useState<number | null>(selectedFromUrl);
  const [search, setSearch] = useState("");
  const queryInput = useMemo(
    () => ({ search: search.trim() || undefined }),
    [search]
  );
  const contactsQuery = trpc.contacts.list.useQuery(queryInput, {
    refetchInterval: 5000,
  });
  const detailQuery = trpc.contacts.detail.useQuery(
    { id: selectedId ?? 0 },
    { enabled: selectedId !== null }
  );
  const contacts = contactsQuery.data ?? [];
  const details = detailQuery.data;

  useEffect(() => {
    if (selectedFromUrl !== selectedId) setSelectedId(selectedFromUrl);
  }, [selectedFromUrl, selectedId]);
  const selectCustomer = (id: number) => {
    setSelectedId(id);
    setLocation(`/dashboard/contacts?contact=${id}`);
  };

  return (
    <main className="mx-auto max-w-6xl space-y-5" dir="rtl">
      <header className="rounded-3xl bg-gradient-to-l from-blue-700 via-blue-600 to-blue-500 px-6 py-7 text-white shadow-xl shadow-blue-200">
        <p className="text-xs font-semibold tracking-[.16em] text-blue-100">
          CUSTOMER DIRECTORY
        </p>
        <h1 className="mt-2 text-2xl font-bold">ملفات العملاء</h1>
        <p className="mt-1 text-sm text-blue-100">
          افتح غرفة العميل لمراجعة ملفه، محادثاته، طلبه، وواجهة التطبيق المخصصة له.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm">
          <div className="border-b border-blue-50 p-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="ابحث باسم العميل"
                className="h-11 rounded-xl pr-9 text-right"
              />
            </div>
          </div>
          <div className="max-h-[650px] divide-y divide-blue-50 overflow-y-auto">
            {contactsQuery.isLoading && (
              <div className="flex justify-center p-10">
                <Loader2 className="size-5 animate-spin text-blue-600" />
              </div>
            )}
            {!contactsQuery.isLoading && !contacts.length && (
              <div className="p-10 text-center text-sm text-slate-400">
                لا يوجد عملاء يطابقون البحث.
              </div>
            )}
            {contacts.map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => selectCustomer(contact.id)}
                className={`flex w-full items-center gap-3 p-4 text-right transition ${selectedId === contact.id ? "bg-blue-50" : "hover:bg-slate-50"}`}
              >
                <CustomerAvatar
                  name={contact.displayName}
                  src={contact.avatarUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-slate-800">
                    {contact.displayName}
                  </p>
                  <p className="mt-1 truncate text-xs text-slate-400">
                    آخر نشاط: {formatDate(contact.lastActivityAt)}
                  </p>
                </div>
                <span
                  className={`size-2 rounded-full ${contact.connectionStatus === "online" ? "bg-emerald-500" : contact.connectionStatus === "away" ? "bg-amber-400" : "bg-slate-300"}`}
                />
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
          {!selectedId && (
            <div className="flex min-h-80 flex-col items-center justify-center text-center">
              <UsersRound className="mb-3 size-10 text-blue-300" />
              <p className="font-semibold text-slate-700">
                اختر عميلاً لعرض ملفه
              </p>
            </div>
          )}
          {detailQuery.isLoading && (
            <div className="flex min-h-80 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-blue-600" />
            </div>
          )}
          {details && (
            <div>
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-blue-50 pb-5">
                <div className="flex items-center gap-3">
                  <CustomerAvatar
                    name={details.contact.displayName}
                    src={details.contact.avatarUrl}
                    size="size-14"
                  />
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {details.contact.displayName}
                    </h2>
                    <p className="mt-1 text-sm text-slate-400">
                      عميل منذ {formatDate(details.contact.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() =>
                      setLocation(
                        getCustomerChatPath(details.conversations[0]?.id)
                      )
                    }
                    disabled={!details.conversations.length}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    <MessageCircle className="ml-2 size-4" />
                    فتح المحادثة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setLocation(
                        `/dashboard/customer-ui?contact=${details.contact.id}`
                      )
                    }
                    className="rounded-xl"
                  >
                    <Paintbrush className="ml-2 size-4" />
                    واجهة العميل
                  </Button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoCard
                  label="البريد الإلكتروني"
                  value={details.contact.email || "غير متوفر"}
                />
                <InfoCard
                  label="رقم الهاتف"
                  value={details.contact.phone || "غير متوفر"}
                />
                {details.contact.extraData && (
                  <InfoCard
                    label="معلومات إضافية"
                    value={details.contact.extraData}
                    wide
                  />
                )}
              </div>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <section>
                  <SectionTitle
                    icon={<MessageCircle className="size-4 text-blue-600" />}
                    title={`المحادثات (${details.conversations.length})`}
                  />
                  {details.conversations.map(conversation => (
                    <div
                      key={conversation.id}
                      className="mt-3 rounded-2xl bg-slate-50 p-3"
                    >
                      <div className="flex justify-between gap-2">
                        <span className="line-clamp-1 text-sm font-semibold text-slate-700">
                          {conversation.issue}
                        </span>
                        <Badge className="border-0 bg-blue-100 text-blue-700 hover:bg-blue-100">
                          {chatStatus[conversation.status]}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {formatDate(conversation.lastMessageAt)}
                      </p>
                    </div>
                  ))}
                </section>
                <section>
                  <SectionTitle
                    icon={<PhoneCall className="size-4 text-blue-600" />}
                    title={`المكالمات (${details.calls.length})`}
                  />
                  {details.calls.length === 0 ? (
                    <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-400">
                      لا توجد مكالمات.
                    </p>
                  ) : (
                    details.calls.map(call => (
                      <div
                        key={call.id}
                        className="mt-3 rounded-2xl bg-slate-50 p-3"
                      >
                        <p className="text-sm font-semibold text-slate-700">
                          {call.status}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">
                          {formatDate(call.createdAt)} ·{" "}
                          {call.durationSeconds
                            ? `${call.durationSeconds} ثانية`
                            : "دون مدة"}
                        </p>
                      </div>
                    ))
                  )}
                </section>
              </div>
              <section className="mt-6">
                <SectionTitle
                  icon={<ClipboardCheck className="size-4 text-blue-600" />}
                  title={`غرفة مراجعة الطلبات (${details.requests.length})`}
                />
                {details.requests.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-400">
                    لا توجد طلبات مرتبطة بهذا العميل.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-4">
                    {details.requests.map(request => (
                      <RequestReviewCard
                        key={request.id}
                        request={request}
                        onOpen={() => setLocation(`/dashboard/requests?request=${request.id}`)}
                        onOpenChat={() => setLocation(getCustomerChatPath(details.conversations[0]?.id))}
                        canOpenChat={Boolean(details.conversations.length)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <p
      className={`rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ${wide ? "sm:col-span-2" : ""}`}
    >
      <strong className="mb-1 block text-xs text-slate-400">{label}</strong>
      {value}
    </p>
  );
}
function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <h3 className="flex items-center gap-2 font-bold text-slate-800">
      {icon}
      {title}
    </h3>
  );
}

type ReviewRequest = {
  id: number;
  requestNumber: string;
  title: string;
  description: string;
  status: keyof typeof requestStatus;
  lastUpdatedAt: Date | string;
};

function RequestReviewCard({ request, onOpen, onOpenChat, canOpenChat }: { request: ReviewRequest; onOpen: () => void; onOpenChat: () => void; canOpenChat: boolean }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(request.title);
  const [description, setDescription] = useState(request.description);
  const [status, setStatus] = useState<ReviewRequest["status"]>(request.status);
  useEffect(() => { setTitle(request.title); setDescription(request.description); setStatus(request.status); }, [request.description, request.status, request.title]);
  const update = trpc.requests.update.useMutation({
    onSuccess: () => { void utils.contacts.detail.invalidate(); void utils.requests.list.invalidate(); toast.success("تم حفظ تحديث الطلب في غرفة المراجعة."); },
    onError: error => toast.error(error.message),
  });
  const changed = title.trim() !== request.title || description.trim() !== request.description || status !== request.status;
  return <article className="rounded-3xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm"><div className="flex flex-col gap-3 border-b border-blue-100 pb-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-sm text-blue-950">{request.requestNumber}</strong><Badge className="border-0 bg-white text-blue-700 shadow-sm hover:bg-white">{requestStatus[status]}</Badge></div><p className="mt-1 text-xs text-slate-400">آخر مراجعة: {formatDate(request.lastUpdatedAt)}</p></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={onOpen} className="rounded-lg border-blue-200"><FilePenLine className="ml-1.5 size-3.5" />غرفة الطلب</Button><Button size="sm" variant="outline" onClick={onOpenChat} disabled={!canOpenChat} className="rounded-lg border-emerald-200 text-emerald-700"><MessageCircle className="ml-1.5 size-3.5" />مراسلة العميل</Button></div></div><div className="mt-4 grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]"><div className="space-y-2"><label className="text-xs font-bold text-slate-600">حالة المراجعة</label><Select value={status} onValueChange={value => setStatus(value as ReviewRequest["status"])}><SelectTrigger className="h-10 rounded-xl bg-white"><SelectValue /></SelectTrigger><SelectContent dir="rtl">{Object.entries(requestStatus).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><label className="text-xs font-bold text-slate-600">عنوان الطلب</label><Input value={title} onChange={event => setTitle(event.target.value)} className="h-10 rounded-xl bg-white text-right" /></div></div><div className="mt-3 space-y-2"><label className="text-xs font-bold text-slate-600">تفاصيل المراجعة والطلب</label><Textarea value={description} onChange={event => setDescription(event.target.value)} className="min-h-24 rounded-xl bg-white text-right leading-6" /></div><div className="mt-3 flex justify-end"><Button onClick={() => update.mutate({ id: request.id, status, title: title.trim(), description: description.trim() })} disabled={!changed || update.isPending || title.trim().length < 2 || description.trim().length < 2} className="rounded-xl bg-blue-700 hover:bg-blue-800">{update.isPending ? "جارٍ الحفظ…" : "حفظ مراجعة الطلب"}</Button></div></article>;
}
