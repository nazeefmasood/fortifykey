"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Shield } from "lucide-react";
import { PasswordCard } from "../../../components/cards/PasswordCard";
import { useVaultItems } from "../../../hooks/useVaultItems";
import { useCategories } from "../../../hooks/useCategories";
import type { PasswordStrengthLabel, LoginPayload } from "@fortifykey/shared";

function getStrengthLabel(score: number | null): PasswordStrengthLabel {
  if (score === null) return "weak";
  if (score >= 70) return "strong";
  if (score >= 40) return "medium";
  return "weak";
}

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const { items, loading } = useVaultItems();
  const { categories } = useCategories();
  const router = useRouter();

  const categoryNames = ["All", ...categories.map((c) => c.name)];

  const filtered = useMemo(() => {
    if (selectedCategory === "All") return items;
    const cat = categories.find((c) => c.name === selectedCategory);
    if (!cat) return items;
    return items.filter((item) => item.category_id === cat.id);
  }, [items, selectedCategory, categories]);

  const stats = useMemo(() => {
    const total = items.length;
    const strong = items.filter(
      (i) => getStrengthLabel(i.password_strength) === "strong"
    ).length;
    const medium = items.filter(
      (i) => getStrengthLabel(i.password_strength) === "medium"
    ).length;
    const weak = items.filter(
      (i) => getStrengthLabel(i.password_strength) === "weak"
    ).length;
    return { total, strong, medium, weak };
  }, [items]);

  return (
    <div className="min-h-full bg-fk-blue">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Header bar (mobile only) */}
        <div className="flex items-center justify-between md:hidden mb-6">
          <div className="flex items-center">
            <div className="w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center">
              <Shield size={24} className="text-fk-blue" />
            </div>
            <div className="w-[50px] h-[50px] bg-black rounded-full -ml-3 flex items-center justify-center">
              <span className="text-white text-xs font-bold">FK</span>
            </div>
          </div>
          <Link
            href="/new-item"
            className="flex items-center gap-2 bg-fk-blue-dark text-white py-3 px-5 rounded-full font-medium text-sm"
          >
            <PlusCircle size={16} />
            New item
          </Link>
        </div>

        {/* Hero text */}
        <h1 className="text-white text-6xl md:text-8xl font-semibold leading-[0.95] mb-8">
          Keep
          <br />
          Your Life
          <br />
          Safe
        </h1>

        {/* Category pills */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-none">
          {categoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? "bg-black text-white"
                  : "bg-transparent text-white border border-black"
              }`}
            >
              {cat}
            </button>
          ))}
          <button className="px-5 py-2.5 rounded-full text-sm font-medium text-white border border-black">
            +
          </button>
        </div>

        {/* Stats section */}
        <div className="flex gap-6 mb-8">
          <div>
            <p className="text-white text-6xl font-bold">{stats.total}</p>
            <p className="text-white/80 text-xs font-bold uppercase tracking-wider">
              Passwords
            </p>
          </div>
          <div className="flex gap-6 items-end">
            <div>
              <p className="text-white text-2xl font-medium">{stats.strong}</p>
              <p className="text-white/80 text-xs font-medium uppercase">
                Strong
              </p>
            </div>
            <div>
              <p className="text-white text-2xl font-medium">{stats.medium}</p>
              <p className="text-white/80 text-xs font-medium uppercase">
                Medium
              </p>
            </div>
            <div>
              <p className="text-white text-2xl font-medium">{stats.weak}</p>
              <p className="text-white/80 text-xs font-medium uppercase">
                Weak
              </p>
            </div>
          </div>
        </div>

        {/* Password cards */}
        <div className="space-y-4 pb-8">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/70 text-lg mb-4">
                No passwords yet
              </p>
              <Link
                href="/new-item"
                className="inline-flex items-center gap-2 bg-white text-fk-blue px-6 py-3 rounded-full font-semibold"
              >
                <PlusCircle size={18} />
                Add your first password
              </Link>
            </div>
          ) : (
            filtered.map((item) => {
              const loginData = item.item_type === "login" ? (item.data as LoginPayload) : null;
              return (
                <PasswordCard
                  key={item.id}
                  websiteName={item.name}
                  email={loginData?.username ?? ""}
                  tags={[item.item_type]}
                  strength={getStrengthLabel(item.password_strength)}
                  iconUrl={item.icon_url}
                  onClick={() => router.push(`/item/${item.id}`)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
