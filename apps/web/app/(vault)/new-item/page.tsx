"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Globe,
  Link2,
  User,
  Lock,
  FolderOpen,
  FileText,
  RotateCw,
  CreditCard,
  Wifi,
  Key,
  ShieldCheck,
  StickyNote,
  IdCard,
} from "lucide-react";
import { useVaultItems } from "../../../hooks/useVaultItems";
import { useCategories } from "../../../hooks/useCategories";
import type { ItemType, LoginPayload, CardPayload, NotePayload, IdentityPayload, WifiPayload, LicensePayload, BackupCodesPayload, VaultPayload } from "@fortifykey/shared";

const itemTypes: { value: ItemType; label: string; icon: typeof Globe }[] = [
  { value: "login", label: "Login", icon: Globe },
  { value: "card", label: "Credit Card", icon: CreditCard },
  { value: "note", label: "Secure Note", icon: StickyNote },
  { value: "identity", label: "Identity", icon: IdCard },
  { value: "wifi", label: "WiFi", icon: Wifi },
  { value: "license", label: "License", icon: Key },
  { value: "backup_codes", label: "Backup Codes", icon: ShieldCheck },
];

function NewItemForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefilledPassword = searchParams.get("password") ?? "";
  const { addItem } = useVaultItems();
  const { categories } = useCategories();

  const [itemType, setItemType] = useState<ItemType>("login");
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Login fields
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(prefilledPassword);
  const [notes, setNotes] = useState("");

  // Card fields
  const [cardholderName, setCardholderName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [cvv, setCvv] = useState("");
  const [pin, setPin] = useState("");

  // WiFi fields
  const [ssid, setSsid] = useState("");
  const [wifiPassword, setWifiPassword] = useState("");
  const [securityType, setSecurityType] = useState<WifiPayload["security_type"]>("WPA2");

  // License fields
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseEmail, setLicenseEmail] = useState("");

  // Backup codes
  const [backupCodes, setBackupCodes] = useState("");

  // Note content
  const [noteContent, setNoteContent] = useState("");

  // Identity fields
  const [fullName, setFullName] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);

    try {
      let payload: VaultPayload;

      switch (itemType) {
        case "login":
          payload = {
            urls: websiteUrl ? [websiteUrl] : [],
            username,
            password,
            custom_fields: [],
            notes,
          } as LoginPayload;
          break;
        case "card":
          payload = {
            cardholder_name: cardholderName,
            card_number: cardNumber,
            expiry_month: expiryMonth,
            expiry_year: expiryYear,
            cvv,
            card_type: "",
            pin: pin || undefined,
            billing_address: { street: "", city: "", state: "", postal_code: "", country: "" },
            notes,
          } as CardPayload;
          break;
        case "note":
          payload = {
            content: noteContent,
            attachments: [],
          } as NotePayload;
          break;
        case "identity":
          payload = {
            document_type: (documentType || "other") as IdentityPayload["document_type"],
            full_name: fullName,
            document_number: documentNumber,
            issuing_country: "",
            notes,
          } as IdentityPayload;
          break;
        case "wifi":
          payload = {
            ssid,
            password: wifiPassword,
            security_type: securityType,
            hidden_network: false,
            notes,
          } as WifiPayload;
          break;
        case "license":
          payload = {
            product_name: name,
            license_key: licenseKey,
            registered_email: licenseEmail || undefined,
            notes,
          } as LicensePayload;
          break;
        case "backup_codes":
          payload = {
            service_name: name,
            codes: backupCodes.split("\n").filter(Boolean).map((code) => ({ code: code.trim(), used: false })),
            notes,
          } as BackupCodesPayload;
          break;
        default:
          return;
      }

      await addItem(itemType, name, payload, {
        domain: websiteUrl || undefined,
        categoryId: categoryId || undefined,
      });

      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to save item:", err);
    } finally {
      setSaving(false);
    }
  };

  const renderFields = () => {
    switch (itemType) {
      case "login":
        return (
          <>
            <Field label="Website URL" icon={<Link2 size={18} />}>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://google.com"
                className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base"
              />
            </Field>
            <Field label="Username / Email" icon={<User size={18} />}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
                className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base"
              />
            </Field>
            <Field label="Password" icon={<Lock size={18} />}>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Generate a password"
                className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base"
              />
              <Link
                href="/generator"
                className="bg-white/30 rounded-md px-3 py-1.5 text-white/70 text-sm font-medium hover:bg-white/40 transition-colors"
              >
                <RotateCw size={16} />
              </Link>
            </Field>
          </>
        );
      case "card":
        return (
          <>
            <Field label="Cardholder Name" icon={<User size={18} />}>
              <input type="text" value={cardholderName} onChange={(e) => setCardholderName(e.target.value)} placeholder="John Doe" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <Field label="Card Number" icon={<CreditCard size={18} />}>
              <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Month" icon={null}>
                <input type="text" value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} placeholder="MM" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
              </Field>
              <Field label="Year" icon={null}>
                <input type="text" value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)} placeholder="YY" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
              </Field>
              <Field label="CVV" icon={null}>
                <input type="text" value={cvv} onChange={(e) => setCvv(e.target.value)} placeholder="123" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
              </Field>
            </div>
            <Field label="PIN (optional)" icon={<Lock size={18} />}>
              <input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
          </>
        );
      case "note":
        return (
          <Field label="Content" icon={<FileText size={18} />} multiline>
            <textarea value={noteContent} onChange={(e) => setNoteContent(e.target.value)} placeholder="Write your secure note..." rows={8} className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base resize-none" />
          </Field>
        );
      case "identity":
        return (
          <>
            <Field label="Full Name" icon={<User size={18} />}>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <Field label="Document Type" icon={<IdCard size={18} />}>
              <input type="text" value={documentType} onChange={(e) => setDocumentType(e.target.value)} placeholder="Passport, SSN, etc." className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <Field label="Document Number" icon={<Key size={18} />}>
              <input type="text" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="Document number" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
          </>
        );
      case "wifi":
        return (
          <>
            <Field label="Network Name (SSID)" icon={<Wifi size={18} />}>
              <input type="text" value={ssid} onChange={(e) => setSsid(e.target.value)} placeholder="My WiFi" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <Field label="Password" icon={<Lock size={18} />}>
              <input type="text" value={wifiPassword} onChange={(e) => setWifiPassword(e.target.value)} placeholder="WiFi password" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <Field label="Security Type" icon={<ShieldCheck size={18} />}>
              <select value={securityType} onChange={(e) => setSecurityType(e.target.value as WifiPayload["security_type"])} className="flex-1 bg-transparent text-white outline-none text-base appearance-none">
                <option value="WPA2" className="text-black">WPA2</option>
                <option value="WPA3" className="text-black">WPA3</option>
                <option value="WEP" className="text-black">WEP</option>
                <option value="Open" className="text-black">Open</option>
              </select>
            </Field>
          </>
        );
      case "license":
        return (
          <>
            <Field label="License Key" icon={<Key size={18} />}>
              <input type="text" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
            <Field label="Email" icon={<User size={18} />}>
              <input type="email" value={licenseEmail} onChange={(e) => setLicenseEmail(e.target.value)} placeholder="License email" className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base" />
            </Field>
          </>
        );
      case "backup_codes":
        return (
          <Field label="Backup Codes (one per line)" icon={<ShieldCheck size={18} />} multiline>
            <textarea value={backupCodes} onChange={(e) => setBackupCodes(e.target.value)} placeholder={"abc123\ndef456\nghi789"} rows={8} className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base resize-none font-mono" />
          </Field>
        );
    }
  };

  return (
    <div className="min-h-full bg-fk-blue-form">
      <div className="max-w-2xl mx-auto px-5 pt-8 pb-24">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-white/70">Add New Item</h1>
          <p className="text-base text-white/70">Securely store your credentials</p>
        </div>

        {/* Item type selector */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {itemTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setItemType(type.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                itemType === type.value
                  ? "bg-white/30 text-white"
                  : "bg-white/10 text-white/60"
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-5">
          {/* Name (always shown) */}
          <Field label="Name" icon={<Globe size={18} />}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={itemType === "login" ? "e.g. Google" : `Name for this ${itemType}`}
              className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base"
            />
          </Field>

          {/* Type-specific fields */}
          {renderFields()}

          {/* Category (always shown) */}
          <Field label="Category" icon={<FolderOpen size={18} />}>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="flex-1 bg-transparent text-white outline-none text-base appearance-none"
            >
              <option value="" className="text-black">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} className="text-black">
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Notes (for most types) */}
          {itemType !== "note" && itemType !== "backup_codes" && (
            <Field label="Notes" icon={<FileText size={18} />} multiline>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
                rows={4}
                className="flex-1 bg-transparent text-white placeholder-white/50 outline-none text-base resize-none"
              />
            </Field>
          )}
        </div>
      </div>

      {/* Fixed bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-fk-blue-form border-t border-white/10 px-5 py-4 flex gap-3 safe-area-pb">
        <Link
          href="/dashboard"
          className="w-[50px] h-[50px] flex items-center justify-center rounded-full border border-white/70"
        >
          <ArrowLeft size={20} className="text-white/70" />
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-base transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Item"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, icon, children, multiline }: { label: string; icon: React.ReactNode; children: React.ReactNode; multiline?: boolean }) {
  return (
    <div>
      <label className="text-sm font-medium text-white/70 mb-1.5 block">{label}</label>
      <div className={`flex ${multiline ? "items-start" : "items-center"} gap-3 glass-dark rounded-xl px-4 ${multiline ? "py-3" : "h-14"}`}>
        {icon && <span className="text-white/70 shrink-0">{icon}</span>}
        {children}
      </div>
    </div>
  );
}

export default function NewItemPage() {
  return (
    <Suspense>
      <NewItemForm />
    </Suspense>
  );
}
