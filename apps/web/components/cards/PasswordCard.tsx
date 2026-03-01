"use client";

import { MoreHorizontal } from "lucide-react";
import { StrengthBadge } from "../ui/StrengthBadge";
import type { PasswordStrengthLabel } from "@fortifykey/shared";

interface PasswordCardProps {
  websiteName: string;
  email: string;
  tags: string[];
  strength: PasswordStrengthLabel;
  iconUrl?: string | null;
  onClick?: () => void;
}

export function PasswordCard({
  websiteName,
  email,
  tags,
  strength,
  iconUrl,
  onClick,
}: PasswordCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[20px] p-5 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
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
        <button
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={20} className="text-fk-text-secondary" />
        </button>
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
