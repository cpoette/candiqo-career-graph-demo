import { SPEC, getLaneOffsetX } from "@/lib/careerGraph.layout";

export default function TimelineDate({ value, y, lane = 0 }) {
  const offsetX = getLaneOffsetX(lane);

  return (
    <div
      className="absolute text-[12px] font-semibold tracking-[0.04em] text-zinc-500"
      style={{
        left: SPEC.cardX + offsetX,
        top: y,
        width: SPEC.cardWidth,
        height: SPEC.dateHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {value}
    </div>
  );
}
