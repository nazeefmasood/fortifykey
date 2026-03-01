import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import type { PasswordStrengthLabel } from "@fortifykey/shared";

interface StrengthBadgeProps {
  label: PasswordStrengthLabel;
  size?: number;
}

const config: Record<
  PasswordStrengthLabel,
  { color: string; bg: string; Icon: typeof Shield }
> = {
  strong: { color: "text-strength-strong", bg: "bg-strength-strong/10", Icon: ShieldCheck },
  medium: { color: "text-strength-medium", bg: "bg-strength-medium/10", Icon: Shield },
  weak: { color: "text-strength-weak", bg: "bg-strength-weak/10", Icon: ShieldAlert },
};

export function StrengthBadge({ label, size = 24 }: StrengthBadgeProps) {
  const { color, bg, Icon } = config[label];

  return (
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center ${bg}`}
    >
      <Icon size={size} className={color} />
    </div>
  );
}
