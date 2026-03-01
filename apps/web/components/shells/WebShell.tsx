"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  FolderOpen,
  Wand2,
  Settings,
  Lock,
  PlusCircle,
  Shield,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/categories", icon: FolderOpen, label: "Categories" },
  { href: "/generator", icon: Wand2, label: "Generator" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function WebShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-[100dvh]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-[280px] flex-col bg-white border-r border-gray-200">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-gray-100">
          <div className="w-10 h-10 bg-fk-blue rounded-xl flex items-center justify-center">
            <Shield size={22} className="text-white" />
          </div>
          <span className="text-xl font-bold text-fk-text-primary">
            FortifyKey
          </span>
        </div>

        {/* New Item button */}
        <div className="px-4 pt-4">
          <Link
            href="/new-item"
            className="flex items-center justify-center gap-2 w-full py-3 bg-fk-blue text-white font-semibold rounded-xl transition-colors hover:bg-fk-blue-dark"
          >
            <PlusCircle size={18} />
            New Item
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-fk-blue/10 text-fk-blue"
                    : "text-fk-text-secondary hover:bg-gray-100 hover:text-fk-text-primary"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 pb-4 border-t border-gray-100 pt-4">
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-fk-text-secondary hover:bg-gray-100 w-full transition-colors">
            <Lock size={20} />
            Lock Vault
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
