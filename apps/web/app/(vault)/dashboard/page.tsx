"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Shield } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { PasswordCard } from "../../../components/cards/PasswordCard";
import { useVaultItems } from "../../../hooks/useVaultItems";
import { useCategories } from "../../../hooks/useCategories";
import { DashboardSkeleton, VaultItemSkeleton } from "../../../components/ui/Skeleton";
import { StaggerContainer, StaggerItem } from "../../../components/ui/PageTransition";
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

  const handleCopyPassword = async (item: typeof items[0]) => {
    const loginData = item.item_type === "login" ? (item.data as LoginPayload) : null;
    if (loginData?.password) {
      await navigator.clipboard.writeText(loginData.password);
      toast.success("Password copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="min-h-full bg-fk-blue">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-fk-blue">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Header bar (mobile only) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between md:hidden mb-6"
        >
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
        </motion.div>

        {/* Hero text */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-white text-6xl md:text-8xl font-semibold leading-[0.95] mb-8"
        >
          Keep
          <br />
          Your Life
          <br />
          Safe
        </motion.h1>

        {/* Category pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mb-8 overflow-x-auto pb-2 scrollbar-none"
        >
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
        </motion.div>

        {/* Stats section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-6 mb-8"
        >
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
        </motion.div>

        {/* Password cards */}
        <div className="space-y-4 pb-8">
          {filtered.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <p className="text-white/70 text-lg mb-4">
                No passwords yet
              </p>
              <Link
                href="/new-item"
                className="inline-flex items-center gap-2 bg-white text-fk-blue px-6 py-3 rounded-full font-semibold hover:bg-white/90 transition-colors"
              >
                <PlusCircle size={18} />
                Add your first password
              </Link>
            </motion.div>
          ) : (
            <StaggerContainer>
              {filtered.map((item) => {
                const loginData = item.item_type === "login" ? (item.data as LoginPayload) : null;
                return (
                  <StaggerItem key={item.id}>
                    <PasswordCard
                      websiteName={item.name}
                      email={loginData?.username ?? ""}
                      tags={[item.item_type]}
                      strength={getStrengthLabel(item.password_strength)}
                      iconUrl={item.icon_url}
                      onClick={() => router.push(`/item/${item.id}`)}
                      onCopy={() => handleCopyPassword(item)}
                    />
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </div>
    </div>
  );
}
