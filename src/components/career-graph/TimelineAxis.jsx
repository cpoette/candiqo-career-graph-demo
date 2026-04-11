import { SPEC, getLaneOffsetX } from "@/lib/careerGraph.layout";
import { ArrowUpRight, GitBranch, Pause, Focus } from "lucide-react";

export default function TimelineAxis({
  totalHeight,
  xpAnchors,
  laneCount,
  linkPaths = [],
  trajectoryTransitions = [],
  canvasWidth,
  hideLaneLines = false,
  hideDots = false,
  onTransitionEnter,
  onTransitionLeave,
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
            t.fromLane === 0 &&
            t.toLane === 0 &&
            Number.isFinite(t?.x) &&
            Number.isFinite(t?.y1) &&
            Number.isFinite(t?.y2) &&
            Number.isFinite(t?.midY),
        )
        .map((t) => {
          const iconX = t.x;
          const iconY = t.midY;

          let Icon = null;
          let strokeWidth = 1.8;

          if (t.type === "pivot") {
            Icon = GitBranch;
            strokeWidth = 2;
          } else if (t.type === "break") {
            Icon = Pause;
            strokeWidth = 2;
          } else if (t.type === "rise") {
            Icon = ArrowUpRight;
            strokeWidth = 2;
          } else if (t.type === "recentrage") {
            Icon = Focus;
            strokeWidth = 2;
          }

          if (!Icon) return null;

          const CARTOUCHE_SIZE = 30;
          const ICON_SIZE = 14;

          return (
            <g
              key={`${t.fromXpId}-${t.toXpId}`}
              className="pointer-events-auto cursor-pointer"
              onMouseEnter={() => onTransitionEnter?.(t)}
              onMouseLeave={() => onTransitionLeave?.()}
            >
              <circle
                cx={iconX}
                cy={iconY}
                r={CARTOUCHE_SIZE / 2}
                fill="white"
                stroke="#e4e4e7"
                strokeWidth="1"
              />

              <foreignObject
                x={iconX - ICON_SIZE / 2}
                y={iconY - ICON_SIZE / 2}
                width={ICON_SIZE}
                height={ICON_SIZE}
              >
                <div className="flex h-full w-full items-center justify-center text-zinc-500">
                  <Icon size={ICON_SIZE} strokeWidth={strokeWidth} />
                </div>
              </foreignObject>
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
