"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Grid3X3,
  PlusCircle,
  Key,
  Settings,
} from "lucide-react";

const bottomNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/categories", icon: Grid3X3, label: "Vault" },
  { href: "/new-item", icon: PlusCircle, label: "Add" },
  { href: "/generator", icon: Key, label: "Generate" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function PwaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-[100dvh]">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 safe-area-pb z-50">
        <div className="flex justify-around py-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 text-xs transition-colors ${
                  isActive
                    ? "text-fk-blue"
                    : "text-fk-text-secondary"
                }`}
              >
                <item.icon size={22} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
