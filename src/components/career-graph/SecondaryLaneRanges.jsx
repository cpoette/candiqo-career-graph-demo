import { SPEC, getLaneOffsetX } from "@/lib/careerGraph.layout";

export default function SecondaryLaneRanges({
  steps = [],
  canvasWidth,
  totalHeight,
}) {
  const secondaryXpSteps = steps.filter(
    (step) =>
      step.type === "xp" &&
      step.lane > 0 &&
      Number.isFinite(step.rangeTopY) &&
      Number.isFinite(step.rangeBottomY),
  );

  if (!Number.isFinite(canvasWidth) || !Number.isFinite(totalHeight)) {
    return null;
  }

  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox={`0 0 ${canvasWidth} ${totalHeight}`}
      preserveAspectRatio="none"
    >
      {secondaryXpSteps.map((step) => {
        const x =
          SPEC.timelineX + getLaneOffsetX(step.lane) + SPEC.cardWidth / 2;

        const topLabel = step.xp?.identity?.is_current
          ? "Aujourd’hui"
          : step.xp?.identity?.date_end?.match(/(19|20)\d{2}/)?.[0] || "";

        const bottomLabel =
          step.xp?.identity?.date_start?.match(/(19|20)\d{2}/)?.[0] || "";

        return (
          <g key={`range-${step.xp.id}`}>
            <line
              x1={x}
              x2={x}
              y1={step.rangeTopY}
              y2={step.rangeBottomY}
              stroke="#c4b5fd"
              strokeWidth="1.5"
              opacity="0.26"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />

            {topLabel ? (
              <text
                x={x}
                y={step.rangeTopY - 8}
                textAnchor="middle"
                fontSize="10"
                fill="#71717a"
              >
                {topLabel}
              </text>
            ) : null}

            {bottomLabel ? (
              <text
                x={x}
                y={step.rangeBottomY + 14}
                textAnchor="middle"
                fontSize="10"
                fill="#71717a"
              >
                {bottomLabel}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
