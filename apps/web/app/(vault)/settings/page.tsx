"use client";

import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import {
  Shield,
  Lock,
  Clock,
  Palette,
  Bell,
  Download,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useMasterKeyStore } from "../../../stores/master-key";
import { useActivityLog } from "../../../stores/activity-log";
import { ActivityLogSection } from "../../../components/settings/ActivityLog";

const settingsSections = [
  {
    title: "Security",
    items: [
      {
        icon: Lock,
        label: "Change Master Password",
        description: "Update your vault encryption key",
        action: "change-master-password",
      },
      {
        icon: Clock,
        label: "Auto-Lock Timer",
        description: "Currently set to 15 minutes",
        action: "auto-lock",
      },
    ],
  },
  {
    title: "Preferences",
    items: [
      {
        icon: Palette,
        label: "Appearance",
        description: "Theme and display settings",
        action: "appearance",
      },
      {
        icon: Bell,
        label: "Notifications",
        description: "Breach alerts and reminders",
        action: "notifications",
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        icon: Download,
        label: "Export Vault",
        description: "Download an encrypted backup",
        action: "export",
      },
    ],
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { signOut } = useClerk();
  const lock = useMasterKeyStore((s) => s.lock);
  const { log } = useActivityLog();

  const handleSignOut = async () => {
    lock();
    log("vault_locked", "Signed out");
    await signOut();
    router.push("/login");
  };

  const handleLock = () => {
    lock();
    log("vault_locked", "Vault locked manually");
    toast.success("Vault locked");
    router.push("/lock");
  };

  const handleSettingClick = (action: string) => {
    log("settings_changed", `Opened ${action} settings`);

    switch (action) {
      case "export":
        toast.info("Export feature coming soon");
        break;
      case "change-master-password":
        toast.info("Master password change coming soon");
        break;
      case "auto-lock":
        toast.info("Auto-lock settings coming soon");
        break;
      default:
        toast.info(`${action} settings coming soon`);
    }
  };

  return (
    <div className="min-h-full bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
        <h1 className="text-2xl font-bold text-fk-text-primary mb-8">
          Settings
        </h1>

        {settingsSections.map((section) => (
          <div key={section.title} className="mb-8">
            <h2 className="text-sm font-semibold text-fk-text-secondary uppercase tracking-wider mb-3 px-1">
              {section.title}
            </h2>
            <div className="bg-white rounded-2xl divide-y divide-gray-100 shadow-sm">
              {section.items.map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleSettingClick(item.action)}
                  className="flex items-center gap-4 w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className="w-10 h-10 bg-fk-blue/10 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon size={20} className="text-fk-blue" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-fk-text-primary">
                      {item.label}
                    </p>
                    <p className="text-sm text-fk-text-secondary">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight
                    size={18}
                    className="text-fk-text-secondary shrink-0"
                  />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Activity Log */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-fk-text-secondary uppercase tracking-wider mb-3 px-1">
            Activity
          </h2>
          <ActivityLogSection />
        </div>

        {/* Lock vault */}
        <button
          onClick={handleLock}
          className="flex items-center gap-4 w-full px-5 py-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors mb-4"
        >
          <div className="w-10 h-10 bg-fk-blue/10 rounded-xl flex items-center justify-center">
            <Lock size={20} className="text-fk-blue" />
          </div>
          <span className="font-medium text-fk-text-primary">Lock Vault</span>
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-4 w-full px-5 py-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50 transition-colors"
        >
          <div className="w-10 h-10 bg-strength-weak/10 rounded-xl flex items-center justify-center">
            <LogOut size={20} className="text-strength-weak" />
          </div>
          <span className="font-medium text-strength-weak">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
