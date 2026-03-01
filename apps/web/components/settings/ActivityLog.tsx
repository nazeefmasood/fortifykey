"use client";

import { useState } from "react";
import {
  Unlock,
  Lock,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Wand2,
  FolderPlus,
  FolderMinus,
  RefreshCw,
  Check,
  X,
  Download,
  Settings,
  Clock,
  ChevronRight,
  AlertTriangle,
  Monitor,
  Globe,
  Smartphone,
  Puzzle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useActivityLog,
  actionLabels,
  type ActivityAction,
  type ActivityLogEntry,
  type ActivityPlatform,
} from "../../stores/activity-log";

const iconMap: Record<ActivityAction, typeof Unlock> = {
  vault_unlocked: Unlock,
  vault_locked: Lock,
  item_created: Plus,
  item_viewed: Eye,
  item_edited: Pencil,
  item_deleted: Trash2,
  item_copied: Copy,
  password_generated: Wand2,
  category_created: FolderPlus,
  category_deleted: FolderMinus,
  sync_started: RefreshCw,
  sync_completed: Check,
  sync_failed: X,
  export_vault: Download,
  settings_changed: Settings,
};

const actionColors: Record<ActivityAction, string> = {
  vault_unlocked: "text-green-500 bg-green-50",
  vault_locked: "text-amber-500 bg-amber-50",
  item_created: "text-blue-500 bg-blue-50",
  item_viewed: "text-gray-500 bg-gray-50",
  item_edited: "text-purple-500 bg-purple-50",
  item_deleted: "text-red-500 bg-red-50",
  item_copied: "text-indigo-500 bg-indigo-50",
  password_generated: "text-orange-500 bg-orange-50",
  category_created: "text-teal-500 bg-teal-50",
  category_deleted: "text-red-500 bg-red-50",
  sync_started: "text-blue-500 bg-blue-50",
  sync_completed: "text-green-500 bg-green-50",
  sync_failed: "text-red-500 bg-red-50",
  export_vault: "text-purple-500 bg-purple-50",
  settings_changed: "text-gray-500 bg-gray-50",
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than a minute
  if (diff < 60000) {
    return "Just now";
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours}h ago`;
  }

  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return `${days}d ago`;
  }

  // Format as date
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ActivityLogSection() {
  const { entries, clearLogs } = useActivityLog();
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<ActivityAction | "all">("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filteredEntries =
    filter === "all" ? entries : entries.filter((e) => e.action === filter);

  const displayedEntries = expanded ? filteredEntries : filteredEntries.slice(0, 10);

  const handleClearLogs = () => {
    clearLogs();
    setShowClearConfirm(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-5 py-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <Clock size={20} className="text-purple-500" />
          </div>
          <div className="text-left">
            <p className="font-medium text-fk-text-primary">Activity Log</p>
            <p className="text-sm text-fk-text-secondary">
              {entries.length} events recorded
            </p>
          </div>
        </div>
        <ChevronRight
          size={18}
          className={`text-fk-text-secondary transition-transform ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-gray-100">
              {/* Filter */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as ActivityAction | "all")}
                  className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-fk-blue/30"
                >
                  <option value="all">All Actions</option>
                  <option value="vault_unlocked">Unlocks</option>
                  <option value="item_created">Created</option>
                  <option value="item_viewed">Viewed</option>
                  <option value="item_copied">Copied</option>
                  <option value="item_deleted">Deleted</option>
                  <option value="password_generated">Generated</option>
                  <option value="sync_completed">Sync</option>
                </select>

                {entries.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Clear Log
                  </button>
                )}
              </div>

              {/* Entries */}
              <div className="max-h-[400px] overflow-y-auto">
                {displayedEntries.length === 0 ? (
                  <div className="py-12 text-center text-fk-text-secondary text-sm">
                    No activity recorded yet
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {displayedEntries.map((entry) => (
                      <ActivityLogItem key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </div>

              {/* Show more */}
              {filteredEntries.length > 10 && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="w-full py-3 text-sm text-fk-blue font-medium hover:bg-gray-50 transition-colors"
                >
                  Show all {filteredEntries.length} entries
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear confirmation modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2">Clear Activity Log?</h3>
              <p className="text-sm text-fk-text-secondary text-center mb-6">
                This will permanently delete all {entries.length} activity records. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearLogs}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
                >
                  Clear Log
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const platformIcons: Record<ActivityPlatform, typeof Monitor> = {
  web: Globe,
  desktop: Monitor,
  pwa: Smartphone,
  extension: Puzzle,
};

const platformLabels: Record<ActivityPlatform, string> = {
  web: "Web",
  desktop: "Desktop",
  pwa: "PWA",
  extension: "Extension",
};

const platformColors: Record<ActivityPlatform, string> = {
  web: "text-blue-500",
  desktop: "text-purple-500",
  pwa: "text-green-500",
  extension: "text-orange-500",
};

function ActivityLogItem({ entry }: { entry: ActivityLogEntry }) {
  const Icon = iconMap[entry.action];
  const colorClass = actionColors[entry.action];
  const PlatformIcon = platformIcons[entry.platform];
  const platformColor = platformColors[entry.platform];

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-fk-text-primary truncate">
            {actionLabels[entry.action]}
          </p>
          <div className={`flex items-center gap-1 ${platformColor}`}>
            <PlatformIcon size={10} />
            <span className="text-[10px] font-medium">{platformLabels[entry.platform]}</span>
          </div>
        </div>
        <p className="text-xs text-fk-text-secondary truncate">{entry.details}</p>
      </div>
      <span className="text-xs text-fk-text-muted whitespace-nowrap">
        {formatTimestamp(entry.timestamp)}
      </span>
    </div>
  );
}
