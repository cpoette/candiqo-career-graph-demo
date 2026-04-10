import TimelineAxis from "./TimelineAxis";
import DomainPill from "./DomainPill";

export default function DomainOverlayLayer({
  totalHeight,
  canvasWidth,
  xpAnchors,
  laneCount,
  linkPaths,
  domains,
  activeDomainIds,
  hoveredDomainId,
  setHoveredDomainId,
  topOffset,
}) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      style={{ height: totalHeight }}
    >
      <div className="sticky pointer-events-none" style={{ top: topOffset }}>
        <div
          className="relative pointer-events-none"
          style={{ width: canvasWidth, height: totalHeight }}
        >
          <TimelineAxis
            totalHeight={totalHeight}
            xpAnchors={xpAnchors}
            laneCount={laneCount}
            linkPaths={linkPaths}
            canvasWidth={canvasWidth}
            hideLaneLines
            hideDots
          />

          {domains.map((domain) => (
            <div key={domain.id} className="pointer-events-auto">
              <DomainPill
                domain={domain}
                isActive={
                  activeDomainIds.has(domain.id) ||
                  hoveredDomainId === domain.id
                }
                onMouseEnter={() => setHoveredDomainId(domain.id)}
                onMouseLeave={() => setHoveredDomainId(null)}
                onClick={() =>
                  setHoveredDomainId((prev) =>
                    prev === domain.id ? null : domain.id,
                  )
                }
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
