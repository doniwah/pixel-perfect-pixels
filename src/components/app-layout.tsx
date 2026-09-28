import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Thermometer,
  LineChart,
  SlidersHorizontal,
  Workflow,
  Settings as SettingsIcon,
  Menu,
  Leaf,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    group: "Monitoring",
    items: [
      { to: "/microclimate", label: "Microclimate", icon: Thermometer },
      { to: "/history", label: "Historical Data", icon: LineChart },
    ],
  },
  {
    group: "Control",
    items: [
      { to: "/control", label: "Smart Control", icon: SlidersHorizontal },
      { to: "/automation", label: "Automation", icon: Workflow },
    ],
  },
  {
    group: "System",
    items: [{ to: "/settings", label: "Settings", icon: SettingsIcon }],
  },
] as const;

function NavContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 py-7">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Leaf className="size-5" />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Smart Greenhouse</p>
          <p className="text-xs text-muted-foreground">Melon Premium</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 px-3">
        {NAV.map((section) => (
          <div key={section.group}>
            <p className="px-3 pb-2 text-[11px] font-medium tracking-wide text-muted-foreground">
              {section.group}
            </p>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.to;
                return (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <item.icon className="size-[18px]" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="px-6 py-6">
        <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          <span className="font-medium">Greenhouse Online</span>
        </div>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        <NavContent />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border glass-panel px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger className="flex size-9 items-center justify-center rounded-xl bg-secondary">
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 bg-sidebar p-0">
              <NavContent onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <p className="text-sm font-semibold">Smart Greenhouse</p>
        </header>

        <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-12">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p>
      </div>
      {right}
    </div>
  );
}
