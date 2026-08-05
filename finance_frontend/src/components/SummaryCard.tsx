import React from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant: "blue" | "purple" | "red" | "neutral";
}

export function SummaryCard({ title, value, icon: Icon, variant }: SummaryCardProps) {
  const styles = {
    blue: "bg-[#EAF1FF] text-[#2563EB]",
    purple: "bg-[#F3EEFF] text-[#7C3AED]",
    red: "bg-[#FEECEC] text-[#DC2626]",
    neutral: "bg-gray-100 text-gray-600",
  };

  return (
    <div className={cn("rounded-xl p-6 flex flex-col justify-between h-full shadow-sm", styles[variant])}>
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5" />
        <h3 className="font-medium text-sm">{title}</h3>
      </div>
      <div className="text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}
