import { SPEC, getLaneOffsetX } from "@/lib/careerGraph.layout";

export default function TimelineCardSecondary({
  item,
  y,
  lane = 1,
  isActive = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) {
  const axisX = SPEC.timelineX + getLaneOffsetX(lane) + SPEC.cardWidth / 2;
  const width = SPEC.cardWidth - 56;
  const x = axisX - width / 2;

  const company = item?.identity?.company_name || "";
  const title = item?.identity?.job_title || "";
  const location = item?.identity?.location_raw || "";
  const start = item?.identity?.date_start || "";
  const end = item?.identity?.is_current
    ? "Aujourd’hui"
    : item?.identity?.date_end || "";

  return (
    <button
      type="button"
      className={[
        "absolute text-left transition-all",
        "rounded-2xl border",
        isActive
          ? "border-violet-300 bg-violet-50/90 shadow-sm"
          : "border-violet-200/60 bg-zinc-50/90 hover:bg-zinc-50",
      ].join(" ")}
      style={{
        left: x,
        top: y,
        width,
        minHeight: 92,
        padding: "12px 14px",
        opacity: isActive ? 1 : 0.9,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[14px] font-semibold leading-5 text-zinc-800">
            {title}
          </div>

          {company ? (
            <div className="mt-1 text-[12px] font-medium text-zinc-600">
              {company}
            </div>
          ) : null}
        </div>

        <div className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">
          parallèle
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        {(start || end) && (
          <span>
            {start} → {end}
          </span>
        )}
        {location && <span>{location}</span>}
      </div>
    </button>
  );
}
