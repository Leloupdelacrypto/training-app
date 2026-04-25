import { MuscleGroup } from "@/lib/muscles";

interface MuscleGlyphProps {
  group: MuscleGroup;
  size?: "sm" | "lg";
}

function shapeFor(group: MuscleGroup) {
  switch (group) {
    case "pecs":
      return <path d="M10 16c4-4 12-4 16 0m-16 8c4-4 12-4 16 0M18 12v16" />;
    case "dos":
      return <path d="M12 10l6 6 6-6m-12 16l6-6 6 6M10 18h16" />;
    case "epaules":
      return <path d="M8 20c2-5 6-8 10-8s8 3 10 8M18 12v16" />;
    case "biceps":
      return <path d="M10 23c1-4 4-7 8-7 4 0 7 3 8 7m-14-9l2-4 4 2" />;
    case "triceps":
      return <path d="M11 23c2-3 5-5 9-5 3 0 5 1 7 3m-12-8l4-4 3 3" />;
    case "jambes":
      return <path d="M13 8v10l-3 10m13-20v10l3 10M13 18h10" />;
    case "abdos":
      return <path d="M13 9h10M13 15h10M13 21h10M18 9v18" />;
    default:
      return <path d="M18 8v20M8 18h20M11 11l14 14M25 11 11 25" />;
  }
}

export function MuscleGlyph({ group, size = "sm" }: MuscleGlyphProps) {
  return (
    <span className={`muscleGlyph ${size === "lg" ? "isLarge" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        {shapeFor(group)}
      </svg>
    </span>
  );
}
