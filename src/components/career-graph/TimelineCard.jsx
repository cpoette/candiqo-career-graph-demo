import { CalendarDays, MapPin } from "lucide-react";
import { SPEC, getLaneOffsetX } from "@/lib/careerGraph.layout";
import {
  getCompanyLabel,
  getDateRangeLabel,
  getLocationLabel,
} from "@/lib/careerGraph.formatters";

export default function TimelineCard({
  item,
  y,
  lane = 0,
  isActive = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) {
  const offsetX = getLaneOffsetX(lane);

  return (
    <button
      type="button"
      className={`absolute border rounded-[12px] px-4 py-3 shadow-sm transition-all duration-200 text-left ${
        isActive
          ? "border-violet-300 bg-violet-50/40 shadow-md"
          : "border-zinc-300 bg-white"
      }`}
      style={{
        left: SPEC.cardX + offsetX,
        top: y,
        width: SPEC.cardWidth,
        height: SPEC.cardHeight,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="line-clamp-1 text-[14px] font-bold leading-5 text-zinc-900">
        {item?.identity?.job_title || "Poste non précisé"}
      </div>
      <div className="mt-0.5 line-clamp-1 text-[12px] text-zinc-700">
        {getCompanyLabel(item)}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <CalendarDays size={11} />
        <span className="line-clamp-1">{getDateRangeLabel(item)}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <MapPin size={11} />
        <span className="line-clamp-1">{getLocationLabel(item)}</span>
      </div>
    </button>
  );
}
