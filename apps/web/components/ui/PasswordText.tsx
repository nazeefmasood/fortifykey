"use client";

import { classifyChar } from "@fortifykey/shared";

interface PasswordTextProps {
  password: string;
  className?: string;
  charClassName?: string;
}

/**
 * Renders a password with each character colored by type:
 * - Letters: inherit (dark)
 * - Numbers: white
 * - Special characters: gold (#ffd700)
 *
 * Matches the original RN app's PasswordText component.
 */
export function PasswordText({
  password,
  className = "",
  charClassName = "",
}: PasswordTextProps) {
  return (
    <span className={className}>
      {password.split("").map((char, i) => {
        const type = classifyChar(char);
        let color: string;
        switch (type) {
          case "number":
            color = "text-white";
            break;
          case "special":
            color = "text-fk-gold";
            break;
          default:
            color = "text-black";
            break;
        }
        return (
          <span key={i} className={`${color} ${charClassName}`}>
            {char}
          </span>
        );
      })}
    </span>
  );
}
