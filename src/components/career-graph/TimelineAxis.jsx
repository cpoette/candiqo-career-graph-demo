import { SPEC, getLaneOffsetX } from "@/lib/careerGraph.layout";
import { ArrowUpRight, GitBranch, Pause } from "lucide-react";

export default function TimelineAxis({
  totalHeight,
  xpAnchors,
  laneCount,
  linkPaths = [],
  trajectoryTransitions = [],
  canvasWidth,
  hideLaneLines = false,
  hideDots = false,
}) {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox={`0 0 ${canvasWidth} ${totalHeight}`}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="trajectoryGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>

      {!hideLaneLines &&
        Array.from({ length: laneCount }).map((_, lane) => {
          if (lane !== 0) return null;

          const x = SPEC.timelineX + getLaneOffsetX(lane);

          return (
            <line
              key={`lane-${lane}`}
              x1={x}
              x2={x}
              y1={SPEC.topPadding}
              y2={totalHeight - SPEC.bottomPadding}
              stroke="#cdcdcd"
              strokeWidth={2}
              opacity={0.9}
              strokeLinecap="round"
            />
          );
        })}

      {trajectoryTransitions
        .filter(
          (t) =>
            t.lane === 0 &&
            Number.isFinite(t?.x) &&
            Number.isFinite(t?.y1) &&
            Number.isFinite(t?.y2) &&
            Number.isFinite(t?.midY),
        )
        .map((t) => {
          const iconX = t.x - 16;
          const iconY = t.midY;

          return (
            <g key={`${t.fromXpId}-${t.toXpId}`}>
              {/* ligne */}
              <line
                x1={t.x}
                x2={t.x}
                y1={t.y1}
                y2={t.y2}
                stroke="url(#trajectoryGradient)"
                strokeWidth="3"
                opacity="0.5"
                strokeDasharray={t.type === "break" ? "6 8" : undefined}
              />

              {/* ICONS */}
              {t.type === "pivot" && (
                <foreignObject
                  x={iconX - 6}
                  y={iconY - 6}
                  width={16}
                  height={16}
                >
                  <GitBranch size={16} strokeWidth={2.2} />
                </foreignObject>
              )}

              {t.type === "break" && (
                <foreignObject
                  x={iconX - 6}
                  y={iconY - 6}
                  width={16}
                  height={16}
                >
                  <Pause size={16} strokeWidth={1.6} />
                </foreignObject>
              )}

              {t.type === "rise" && (
                <foreignObject
                  x={iconX - 6}
                  y={iconY - 6}
                  width={16}
                  height={16}
                >
                  <ArrowUpRight size={16} strokeWidth={1.6} />
                </foreignObject>
              )}
            </g>
          );
        })}

      {linkPaths.map((link) => (
        <path
          key={link.id}
          d={link.d}
          fill="none"
          stroke={link.active ? "#8b5cf6" : "#d4d4d8"}
          strokeWidth={link.active ? 2.6 : 1.4}
          strokeDasharray={link.active ? "0 1" : "5 6"}
          strokeLinecap="round"
          opacity={link.active ? 0.95 : 0.24}
          vectorEffect="non-scaling-stroke"
        />
      ))}

      {!hideDots &&
        xpAnchors
          .filter((anchor) => anchor.lane === 0)
          .map((anchor) => (
            <circle
              key={anchor.id}
              cx={SPEC.timelineX + getLaneOffsetX(anchor.lane)}
              cy={anchor.y}
              r={anchor.active ? anchor.r + 1.25 : anchor.r}
              fill={anchor.active ? "#7c3aed" : "#18181b"}
              opacity={anchor.active ? 1 : 0.92}
            />
          ))}
    </svg>
  );
}
