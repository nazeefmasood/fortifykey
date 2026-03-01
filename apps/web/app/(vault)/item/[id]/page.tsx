"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Copy, Trash2, ArrowLeft, Eye, EyeOff, Check } from "lucide-react";
import { PasswordText } from "../../../../components/ui/PasswordText";
import { useVaultItems } from "../../../../hooks/useVaultItems";
import type { LoginPayload, CardPayload, WifiPayload, LicensePayload, BackupCodesPayload, NotePayload, IdentityPayload, DecryptedVaultItem } from "@fortifykey/shared";

export default function ItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { items, deleteItem } = useVaultItems();
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const item = items.find((i) => i.id === params.id);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const handleDelete = async () => {
    if (!item || deleting) return;
    if (!confirm("Are you sure you want to delete this item?")) return;

    setDeleting(true);
    try {
      await deleteItem(item.id);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to delete:", err);
      setDeleting(false);
    }
  };

  if (!item) {
    return (
      <div className="min-h-full bg-fk-green flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const renderFields = () => {
    switch (item.item_type) {
      case "login": {
        const data = item.data as LoginPayload;
        return (
          <>
            {data.urls?.length > 0 && (
              <DetailField label="URL" value={data.urls[0]!} onCopy={() => copyToClipboard(data.urls[0]!, "url")} copied={copiedField === "url"} />
            )}
            <DetailField label="Username" value={data.username} onCopy={() => copyToClipboard(data.username, "username")} copied={copiedField === "username"} />
            <div>
              <p className="text-sm font-medium text-black/50 mb-1">Password</p>
              <div className="flex items-center justify-between bg-white/50 rounded-xl px-4 py-3">
                <div className="overflow-x-auto scrollbar-none flex-1 mr-3">
                  {showPassword ? (
                    <PasswordText password={data.password} className="text-lg font-medium whitespace-nowrap" />
                  ) : (
                    <span className="text-lg font-medium tracking-wider">{"•".repeat(Math.min(data.password.length, 20))}</span>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setShowPassword(!showPassword)} className="p-2 hover:bg-black/5 rounded-lg">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                  <button onClick={() => copyToClipboard(data.password, "password")} className="p-2 hover:bg-black/5 rounded-lg">
                    {copiedField === "password" ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                  </button>
                </div>
              </div>
            </div>
            {data.notes && <DetailField label="Notes" value={data.notes} />}
          </>
        );
      }
      case "card": {
        const data = item.data as CardPayload;
        return (
          <>
            <DetailField label="Cardholder" value={data.cardholder_name} />
            <DetailField label="Card Number" value={data.card_number} onCopy={() => copyToClipboard(data.card_number, "card")} copied={copiedField === "card"} />
            <div className="grid grid-cols-2 gap-4">
              <DetailField label="Expiry" value={`${data.expiry_month}/${data.expiry_year}`} />
              <DetailField label="CVV" value={data.cvv} onCopy={() => copyToClipboard(data.cvv, "cvv")} copied={copiedField === "cvv"} />
            </div>
            {data.pin && <DetailField label="PIN" value={data.pin} onCopy={() => copyToClipboard(data.pin!, "pin")} copied={copiedField === "pin"} />}
            {data.notes && <DetailField label="Notes" value={data.notes} />}
          </>
        );
      }
      case "note": {
        const data = item.data as NotePayload;
        return <DetailField label="Content" value={data.content} />;
      }
      case "identity": {
        const data = item.data as IdentityPayload;
        return (
          <>
            <DetailField label="Full Name" value={data.full_name} />
            <DetailField label="Document Type" value={data.document_type} />
            <DetailField label="Document Number" value={data.document_number} onCopy={() => copyToClipboard(data.document_number, "docnum")} copied={copiedField === "docnum"} />
            {data.notes && <DetailField label="Notes" value={data.notes} />}
          </>
        );
      }
      case "wifi": {
        const data = item.data as WifiPayload;
        return (
          <>
            <DetailField label="SSID" value={data.ssid} />
            <DetailField label="Password" value={data.password} onCopy={() => copyToClipboard(data.password, "wifipw")} copied={copiedField === "wifipw"} />
            <DetailField label="Security" value={data.security_type} />
            {data.notes && <DetailField label="Notes" value={data.notes} />}
          </>
        );
      }
      case "license": {
        const data = item.data as LicensePayload;
        return (
          <>
            <DetailField label="License Key" value={data.license_key} onCopy={() => copyToClipboard(data.license_key, "license")} copied={copiedField === "license"} />
            {data.registered_email && <DetailField label="Email" value={data.registered_email} />}
            {data.notes && <DetailField label="Notes" value={data.notes} />}
          </>
        );
      }
      case "backup_codes": {
        const data = item.data as BackupCodesPayload;
        return (
          <>
            <div>
              <p className="text-sm font-medium text-black/50 mb-2">Codes</p>
              <div className="grid grid-cols-2 gap-2">
                {data.codes.map((c, i) => (
                  <div key={i} className={`flex items-center justify-between bg-white/50 rounded-lg px-3 py-2 ${c.used ? "opacity-50 line-through" : ""}`}>
                    <span className="font-mono text-sm">{c.code}</span>
                    <button onClick={() => copyToClipboard(c.code, `code-${i}`)} className="p-1 hover:bg-black/5 rounded">
                      {copiedField === `code-${i}` ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {data.notes && <DetailField label="Notes" value={data.notes} />}
          </>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-fk-green">
      <div className="max-w-2xl mx-auto px-5 pt-8">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="mb-6 w-[50px] h-[50px] flex items-center justify-center rounded-full border border-white/50"
        >
          <ArrowLeft size={20} className="text-white" />
        </button>

        {/* Glass card */}
        <div className="glass-card rounded-t-[30px] p-6 min-h-[60vh]">
          {/* Card header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                {item.icon_url ? (
                  <img src={item.icon_url} alt="" className="w-6 h-6 rounded" />
                ) : (
                  <span className="font-bold text-sm">{item.name.charAt(0)}</span>
                )}
              </div>
            </div>
            <span className="text-xs font-medium bg-black/10 px-3 py-1 rounded-full">
              {item.item_type}
            </span>
          </div>

          {/* Item name */}
          <h1 className="text-[50px] font-bold uppercase leading-tight mb-2">
            {item.name}
          </h1>

          {/* Fields */}
          <div className="space-y-4 mt-6">{renderFields()}</div>

          {/* Delete button */}
          <div className="mt-8 flex justify-center">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              <Trash2 size={18} />
              {deleting ? "Deleting..." : "Delete Item"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value, onCopy, copied }: { label: string; value: string; onCopy?: () => void; copied?: boolean }) {
  return (
    <div>
      <p className="text-sm font-medium text-black/50 mb-1">{label}</p>
      <div className="flex items-center justify-between bg-white/50 rounded-xl px-4 py-3">
        <span className="text-base font-medium break-all">{value}</span>
        {onCopy && (
          <button onClick={onCopy} className="p-2 hover:bg-black/5 rounded-lg shrink-0 ml-2">
            {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
          </button>
        )}
      </div>
    </div>
  );
}
