"use client";

import { useState, useCallback, useRef } from "react";
import { ArrowLeft, RotateCw, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { generatePassword, DEFAULT_GENERATOR_CONFIG } from "@fortifykey/shared";
import { PasswordText } from "../../../components/ui/PasswordText";
import { RadialSlider } from "../../../components/ui/RadialSlider";
import { useActivityLog } from "../../../stores/activity-log";

export default function GeneratorPage() {
  const [config, setConfig] = useState({
    length: DEFAULT_GENERATOR_CONFIG.length,
    wordPercentage: DEFAULT_GENERATOR_CONFIG.wordPercentage,
    specialPercentage: DEFAULT_GENERATOR_CONFIG.specialPercentage,
    numberPercentage: DEFAULT_GENERATOR_CONFIG.numberPercentage,
  });

  const [password, setPassword] = useState(() => generatePassword(config));
  const scrollRef = useRef<HTMLDivElement>(null);
  const { log } = useActivityLog();

  const regenerate = useCallback(() => {
    const newPassword = generatePassword(config);
    setPassword(newPassword);
    log("password_generated", `Generated ${config.length} character password`);
  }, [config, log]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(password);
    toast.success("Password copied to clipboard");
    log("item_copied", "Copied generated password");
  }, [password, log]);

  const updateConfig = useCallback(
    (key: keyof typeof config, value: number) => {
      setConfig((prev) => {
        const next = { ...prev, [key]: value };
        const newPassword = generatePassword(next);
        setPassword(newPassword);
        log("password_generated", `Generated ${next.length} character password`);
        return next;
      });
    },
    [log]
  );

  return (
    <div className="min-h-full bg-fk-red">
      <div className="max-w-2xl mx-auto px-4 md:px-8 pt-10">
        {/* Hero text */}
        <h1 className="text-white text-4xl md:text-5xl font-semibold leading-tight mb-8">
          Create a{" "}
          <span className="text-[#9a3535]">Solid Password</span>
        </h1>

        {/* Slider controls */}
        <div className="flex gap-4 mb-6">
          {/* Words slider */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <label className="text-white text-xs font-bold uppercase tracking-wider">
              Words
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={config.wordPercentage}
              onChange={(e) =>
                updateConfig("wordPercentage", Number(e.target.value))
              }
              className="w-full accent-white [&::-webkit-slider-track]:bg-fk-red-light [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-track]:h-2 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4"
              style={{ writingMode: "vertical-lr" as React.CSSProperties["writingMode"], height: "180px" }}
            />
            <span className="text-white text-lg font-bold">
              {config.wordPercentage}
            </span>
          </div>

          {/* Special slider */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <label className="text-white text-xs font-bold uppercase tracking-wider">
              Special
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={config.specialPercentage}
              onChange={(e) =>
                updateConfig("specialPercentage", Number(e.target.value))
              }
              className="w-full accent-white [&::-webkit-slider-track]:bg-fk-red-light [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-track]:h-2"
              style={{ writingMode: "vertical-lr" as React.CSSProperties["writingMode"], height: "180px" }}
            />
            <span className="text-white text-lg font-bold">
              {config.specialPercentage}
            </span>
          </div>

          {/* Numbers slider */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <label className="text-white text-xs font-bold uppercase tracking-wider">
              Numbers
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={config.numberPercentage}
              onChange={(e) =>
                updateConfig("numberPercentage", Number(e.target.value))
              }
              className="w-full accent-white [&::-webkit-slider-track]:bg-fk-red-light [&::-webkit-slider-track]:rounded-full [&::-webkit-slider-track]:h-2"
              style={{ writingMode: "vertical-lr" as React.CSSProperties["writingMode"], height: "180px" }}
            />
            <span className="text-white text-lg font-bold">
              {config.numberPercentage}
            </span>
          </div>
        </div>

        {/* Radial slider */}
        <div className="flex justify-center my-6">
          <RadialSlider
            value={config.length}
            min={1}
            max={100}
            onChange={(v) => updateConfig("length", v)}
          />
        </div>

        {/* Password display container */}
        <div className="bg-white rounded-t-[50px] md:rounded-t-[70px] mt-4 px-6 md:px-8 py-8 min-h-[230px] flex flex-col">
          <p className="text-fk-red text-xs uppercase tracking-wider font-medium mb-3">
            Random Password
          </p>

          {/* Scrollable password */}
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-2 mb-4 scrollbar-none"
          >
            <PasswordText
              password={password}
              className="text-2xl font-bold uppercase whitespace-nowrap"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between mt-auto gap-3">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-full shadow-md font-medium text-sm hover:shadow-lg transition-shadow"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <button
              onClick={regenerate}
              className="w-[70px] h-[70px] bg-[#fcecea] rounded-full flex items-center justify-center shadow-md hover:shadow-lg transition-shadow"
            >
              <RotateCw size={28} className="text-fk-red" />
            </button>

            <Link
              href={`/new-item?password=${encodeURIComponent(password)}`}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white rounded-full shadow-md font-medium text-sm hover:shadow-lg transition-shadow"
            >
              Use
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
