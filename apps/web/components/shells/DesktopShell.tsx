"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Wand2,
  Settings,
  Lock,
  PlusCircle,
  Shield,
  Minus,
  Square,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/generator", icon: Wand2, label: "Generator" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function DesktopShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Custom titlebar (for Electron frameless window) */}
      <div
        className="flex items-center justify-between h-9 bg-gray-50 border-b border-gray-200 px-4 select-none"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-fk-blue" />
          <span className="text-xs font-semibold text-fk-text-primary">
            FortifyKey
          </span>
        </div>
        <div
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        >
          <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
            <Minus size={14} />
          </button>
          <button className="p-1.5 hover:bg-gray-200 rounded transition-colors">
            <Square size={12} />
          </button>
          <button className="p-1.5 hover:bg-red-500 hover:text-white rounded transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible sidebar */}
        <aside
          className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${
            sidebarExpanded ? "w-[280px]" : "w-[60px]"
          }`}
          onMouseEnter={() => setSidebarExpanded(true)}
          onMouseLeave={() => setSidebarExpanded(false)}
        >
          {/* New Item button */}
          <div className="px-2 pt-4">
            <Link
              href="/new-item"
              className="flex items-center justify-center gap-2 py-3 bg-fk-blue text-white rounded-xl transition-colors hover:bg-fk-blue-dark"
            >
              <PlusCircle size={18} />
              {sidebarExpanded && (
                <span className="font-semibold text-sm">New Item</span>
              )}
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-fk-blue/10 text-fk-blue"
                      : "text-fk-text-secondary hover:bg-gray-100"
                  }`}
                  title={item.label}
                >
                  <item.icon size={20} className="shrink-0" />
                  {sidebarExpanded && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Lock */}
          <div className="px-2 pb-4 border-t border-gray-100 pt-4">
            <button
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-fk-text-secondary hover:bg-gray-100 w-full transition-colors"
              title="Lock Vault"
            >
              <Lock size={20} className="shrink-0" />
              {sidebarExpanded && "Lock Vault"}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
