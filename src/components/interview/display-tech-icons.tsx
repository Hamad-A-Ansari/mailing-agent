"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { techMappings } from "@/constants/interview";

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

function normalizeTechName(tech: string): string | undefined {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return techMappings[key];
}

function getTechIconUrl(tech: string): string {
  const normalized = normalizeTechName(tech);
  if (!normalized) return "/tech copy.svg";
  return `${techIconBaseURL}/${normalized}/${normalized}-original.svg`;
}

interface DisplayTechIconsProps {
  techStack: string[];
  maxIcons?: number;
}

export function DisplayTechIcons({ techStack, maxIcons = 3 }: DisplayTechIconsProps) {
  const visibleTech = techStack.slice(0, maxIcons);
  const remaining = techStack.length - maxIcons;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [imgErrors, setImgErrors] = useState<Set<number>>(new Set());

  return (
    <div className="flex flex-row items-center relative">
      {visibleTech.map((tech, index) => (
        <div
          key={`${tech}-${index}`}
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border cursor-pointer",
            index >= 1 && "-ml-2"
          )}
          style={{ zIndex: hoveredIndex === index ? 50 : 10 - index }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {/* Tooltip — only show for hovered icon */}
          {hoveredIndex === index && (
            <span className="absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-foreground text-background px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shadow-lg z-[100] pointer-events-none">
              {tech}
              <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
            </span>
          )}
          <Image
            src={imgErrors.has(index) ? "/tech copy.svg" : getTechIconUrl(tech)}
            alt={tech}
            width={20}
            height={20}
            className="h-4 w-4"
            unoptimized
            onError={() => setImgErrors((prev) => new Set(prev).add(index))}
          />
        </div>
      ))}
      {remaining > 0 && (
        <span className="ml-2 text-[11px] text-muted-foreground">+{remaining}</span>
      )}
    </div>
  );
}
