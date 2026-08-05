import Image from "next/image";
import { cn } from "@/lib/utils";
import { techMappings } from "@/constants/interview";

const techIconBaseURL = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

function normalizeTechName(tech: string): string | undefined {
  const key = tech.toLowerCase().replace(/\.js$/, "").replace(/\s+/g, "");
  return techMappings[key];
}

function getTechIconUrl(tech: string): string {
  const normalized = normalizeTechName(tech);
  if (!normalized) return "/tech.svg";
  return `${techIconBaseURL}/${normalized}/${normalized}-original.svg`;
}

interface DisplayTechIconsProps {
  techStack: string[];
  maxIcons?: number;
}

export function DisplayTechIcons({ techStack, maxIcons = 3 }: DisplayTechIconsProps) {
  const visibleTech = techStack.slice(0, maxIcons);
  const remaining = techStack.length - maxIcons;

  return (
    <div className="flex flex-row items-center">
      {visibleTech.map((tech, index) => (
        <div
          key={tech}
          className={cn(
            "relative group flex h-8 w-8 items-center justify-center rounded-full bg-muted border border-border",
            index >= 1 && "-ml-2"
          )}
        >
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border shadow-sm z-10">
            {tech}
          </span>
          <Image
            src={getTechIconUrl(tech)}
            alt={tech}
            width={20}
            height={20}
            className="h-4 w-4"
            unoptimized
          />
        </div>
      ))}
      {remaining > 0 && (
        <span className="ml-1 text-xs text-muted-foreground">+{remaining}</span>
      )}
    </div>
  );
}
