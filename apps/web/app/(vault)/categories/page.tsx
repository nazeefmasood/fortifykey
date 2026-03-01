"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Trash2, Copy, Shield, X } from "lucide-react";
import { PasswordText } from "../../../components/ui/PasswordText";
import { useVaultItems } from "../../../hooks/useVaultItems";
import { useCategories } from "../../../hooks/useCategories";
import type { LoginPayload } from "@fortifykey/shared";

export default function CategoriesPage() {
  const router = useRouter();
  const { items } = useVaultItems();
  const { categories, addCategory, deleteCategory } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creating, setCreating] = useState(false);

  const categoryNames = ["All", ...categories.map((c) => c.name)];

  const filteredItems =
    selectedCategory === "All"
      ? items
      : items.filter((item) => {
          const cat = categories.find((c) => c.name === selectedCategory);
          return cat && item.category_id === cat.id;
        });

  const copyPassword = (password: string) => {
    navigator.clipboard.writeText(password);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setCreating(true);
    try {
      await addCategory(newCategoryName.trim());
      setNewCategoryName("");
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create category:", err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-full bg-fk-green">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-[50px] h-[50px] bg-white rounded-full flex items-center justify-center">
              <Shield size={24} className="text-fk-green" />
            </div>
            <div className="w-[50px] h-[50px] bg-black rounded-full -ml-3 flex items-center justify-center">
              <span className="text-white text-xs font-bold">FK</span>
            </div>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-fk-green-dark text-white py-3 px-5 rounded-full font-medium text-sm"
          >
            <PlusCircle size={16} />
            Add New
          </button>
        </div>

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
        </div>

        {/* Password cards carousel */}
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-none">
          {filteredItems.length === 0 ? (
            <div className="w-full text-center py-12">
              <p className="text-white/70 text-lg">No items in this category</p>
            </div>
          ) : (
            filteredItems.map((item) => {
              const loginData = item.item_type === "login" ? (item.data as LoginPayload) : null;
              const pw = loginData?.password ?? "";

              return (
                <div
                  key={item.id}
                  className="snap-center shrink-0 w-[340px] md:w-[400px] bg-fk-green-card rounded-[30px] p-6 cursor-pointer"
                  onClick={() => router.push(`/item/${item.id}`)}
                >
                  {/* Card header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        {item.icon_url ? (
                          <img src={item.icon_url} alt="" className="w-6 h-6 rounded" />
                        ) : (
                          <span className="text-sm font-bold">{item.name.charAt(0)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card content */}
                  <h2 className="text-3xl font-bold text-black mb-1">{item.name}</h2>
                  <p className="text-sm text-black/70 mb-4">
                    {loginData?.username ?? item.item_type}
                  </p>

                  {/* Password display */}
                  {pw && (
                    <div className="mb-6 overflow-x-auto scrollbar-none">
                      <PasswordText
                        password={pw}
                        className="text-4xl md:text-5xl font-medium whitespace-nowrap"
                      />
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    >
                      <Trash2 size={18} className="text-fk-delete" />
                    </button>
                    {pw && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPassword(pw);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-white text-fk-green py-3 rounded-full font-medium text-sm"
                      >
                        <Copy size={16} />
                        Copy Password
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create category modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white w-full md:w-[480px] rounded-t-[20px] md:rounded-[20px] p-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-fk-text-primary">
                Create New Category
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-fk-green">
                <X size={24} />
              </button>
            </div>

            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="w-full bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-fk-green/30 mb-4"
              onKeyDown={(e) => e.key === "Enter" && handleCreateCategory()}
            />

            <button
              onClick={handleCreateCategory}
              disabled={creating || !newCategoryName.trim()}
              className="w-full bg-fk-green text-white py-3 rounded-xl font-semibold disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Category"}
            </button>

            {/* Existing categories with delete */}
            {categories.length > 0 && (
              <div className="mt-6 border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-500 mb-3">Existing Categories</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
