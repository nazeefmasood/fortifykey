"use client";

import { MoreHorizontal, Copy, Eye, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StrengthBadge } from "../ui/StrengthBadge";
import type { PasswordStrengthLabel } from "@fortifykey/shared";

interface PasswordCardProps {
  websiteName: string;
  email: string;
  tags: string[];
  strength: PasswordStrengthLabel;
  iconUrl?: string | null;
  onClick?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
}

export function PasswordCard({
  websiteName,
  email,
  tags,
  strength,
  iconUrl,
  onClick,
  onCopy,
  onDelete,
}: PasswordCardProps) {
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCopy) {
      onCopy();
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete();
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[20px] p-5 shadow-md hover:shadow-lg transition-all cursor-pointer group"
    >
      {/* Tags + menu */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-fk-tag-bg text-fk-tag-text text-xs font-medium px-3 py-1 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onCopy && (
            <button
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              onClick={handleCopy}
              title="Copy password"
            >
              <Copy size={16} className="text-fk-text-secondary" />
            </button>
          )}
          {onDelete && (
            <button
              className="p-2 hover:bg-red-50 rounded-full transition-colors"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          )}
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal size={16} className="text-fk-text-secondary" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-[60px] h-[60px] bg-fk-logo-bg rounded-[15px] flex items-center justify-center overflow-hidden">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt=""
                className="w-8 h-8 object-contain"
              />
            ) : (
              <span className="text-2xl font-bold text-fk-text-primary">
                {websiteName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          {/* Text */}
          <div>
            <p className="text-lg font-bold text-fk-text-primary">
              {websiteName}
            </p>
            <p className="text-sm text-fk-text-secondary">{email}</p>
          </div>
        </div>

        {/* Strength */}
        <StrengthBadge label={strength} />
      </div>
    </div>
  );
}
