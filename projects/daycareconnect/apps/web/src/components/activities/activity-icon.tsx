import type { ActivityType } from "@daycare-hub/shared";
import {
  UtensilsCrossed,
  Moon,
  Palette,
  Trophy,
  Smile,
  Baby,
  AlertTriangle,
  Camera,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<ActivityType, { icon: LucideIcon; color: string }> = {
  meal: { icon: UtensilsCrossed, color: "text-orange-500" },
  nap: { icon: Moon, color: "text-indigo-500" },
  activity: { icon: Palette, color: "text-green-500" },
  milestone: { icon: Trophy, color: "text-yellow-500" },
  mood: { icon: Smile, color: "text-pink-500" },
  bathroom: { icon: Baby, color: "text-blue-500" },
  incident: { icon: AlertTriangle, color: "text-red-500" },
  photo: { icon: Camera, color: "text-purple-500" },
  note: { icon: StickyNote, color: "text-gray-500" },
};

export function ActivityIcon({
  type,
  className = "h-5 w-5",
}: {
  type: ActivityType;
  className?: string;
}) {
  const { icon: Icon, color } = iconMap[type] || iconMap.note;
  return <Icon className={`${color} ${className}`} />;
}

export function getActivityLabel(type: ActivityType): string {
  const labels: Record<ActivityType, string> = {
    meal: "Meal",
    nap: "Nap",
    activity: "Activity",
    milestone: "Milestone",
    mood: "Mood",
    bathroom: "Bathroom",
    incident: "Incident",
    photo: "Photo",
    note: "Note",
  };
  return labels[type] || type;
}
