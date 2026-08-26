import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InstallOwnerAppButton } from "@/components/InstallOwnerAppButton";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { Archive, Bot, ClipboardList, LayoutDashboard, Link2, MessageSquareText, PanelRight, PhoneCall, Settings2, Sparkles, UsersRound, Waves, CirclePlay, Paintbrush, Wrench } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { brandAssets } from "@/lib/brandAssets";

const menuItems = [
  { icon: LayoutDashboard, label: "لوحة التحكم", path: "/" },
  { icon: UsersRound, label: "العملاء", path: "/dashboard/contacts" },
  { icon: ClipboardList, label: "الطلبات", path: "/dashboard/requests" },
  { icon: MessageSquareText, label: "المحادثات", path: "/dashboard/chats" },
  { icon: Link2, label: "روابط الدعوة", path: "/dashboard/invitations" },
  { icon: PhoneCall, label: "سجل المكالمات", path: "/dashboard/calls" },
  { icon: CirclePlay, label: "حالات المؤسسة", path: "/dashboard/statuses" },
  { icon: Paintbrush, label: "محرر واجهة العميل", path: "/dashboard/customer-ui" },
  { icon: Sparkles, label: "وكيل التطبيق", path: "/dashboard/app-agent" },
  { icon: Wrench, label: "غرفة معالجة الأخطاء", path: "/dashboard/agent-errors" },
  { icon: Bot, label: "إعدادات الذكاء الاصطناعي", path: "/dashboard/ai-settings" },
  { icon: Bot, label: "Voice AI", path: "/dashboard/voice-ai" },
  { icon: Waves, label: "النماذج الصوتية", path: "/dashboard/voice-models" },
  { icon: Settings2, label: "الإعدادات", path: "/dashboard/settings" },
  { icon: Archive, label: "الأرشيف", path: "/dashboard/archive" },
];

const mobileNavItems = [
  { icon: LayoutDashboard, label: "الرئيسية", path: "/" },
  { icon: UsersRound, label: "العملاء", path: "/dashboard/contacts" },
  { icon: MessageSquareText, label: "المراسلات", path: "/dashboard/chats" },
  { icon: ClipboardList, label: "الطلبات", path: "/dashboard/requests" },
  { icon: Settings2, label: "الإعدادات", path: "/dashboard/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;
const institutionLogo = brandAssets.privateOffice;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const [location, setLocation] = useLocation();
  const pathname = location.split("?")[0];
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === pathname);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          side="right"
          className="hidden border-l-0 md:flex"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="تبديل قائمة التنقل"
              >
                  <PanelRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate">مراسلة المؤسسة</span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = pathname === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal text-right`}
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <div className="flex items-center gap-3 rounded-lg px-1 py-1 w-full text-right group-data-[collapsible=icon]:justify-center">
              <Avatar className="h-9 w-9 border shrink-0"><AvatarImage src={institutionLogo} alt="مؤسسة الوليد بن طلال الإنسانية" /><AvatarFallback className="text-xs font-medium">م</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden"><p className="text-sm font-medium truncate leading-none">غرفة العمليات المباشرة</p><p className="text-xs text-muted-foreground truncate mt-1.5">إدارة مراسلة المؤسسة</p></div>
            </div>
            <div className="mt-3 group-data-[collapsible=icon]:hidden"><InstallOwnerAppButton /></div>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 hidden h-full w-1 cursor-col-resize transition-colors hover:bg-primary/20 md:block ${isCollapsed ? "!hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-14 items-center justify-between bg-background/95 px-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                      {activeMenuItem?.label ?? "القائمة"}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setLocation("/dashboard/invitations?create=1")} className="flex h-9 items-center gap-1 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700"><Link2 className="size-4" />رابط عميل</button>
          </div>
        )}
        <main className="flex-1 p-4 pb-24 md:pb-4">{children}</main>
      </SidebarInset>
      {isMobile && (
        <nav aria-label="تنقل غرفة العمليات" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-12px_35px_-25px_rgba(15,23,42,.42)] backdrop-blur md:hidden" dir="rtl">
          <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
            {mobileNavItems.map(item => {
              const isActive = item.path === "/" ? pathname === "/" || pathname === "/dashboard" : pathname === item.path;
              return <button key={item.path} type="button" onClick={() => setLocation(item.path)} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition ${isActive ? "bg-blue-50 text-blue-700" : "text-slate-500 hover:bg-slate-50"}`}><item.icon className="size-4" /><span className="truncate">{item.label}</span></button>;
            })}
          </div>
        </nav>
      )}
    </>
  );
}
