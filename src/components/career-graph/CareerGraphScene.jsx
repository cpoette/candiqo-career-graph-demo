/* eslint-disable react-hooks/refs */
/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useRef, useState } from "react";
import { animate, motionValue } from "framer-motion";
import {
  SPEC,
  GAP,
  DOMAIN_WIDTH,
  DOMAIN_CENTER_Y,
  buildLinkPath,
  getLaneOffsetX,
  getXpVisualLinkAnchor,
  buildTrajectoryTransitions,
} from "@/lib/careerGraph.layout";
import { MOTION } from "@/lib/careerGraph.motion";

import TimelineCardSecondary from "./TimelineCardSecondary";
import SecondaryLaneRanges from "./SecondaryLaneRanges";
import TimelineAxis from "./TimelineAxis";
import TimelineDate from "./TimelineDate";
import TimelineCard from "./TimelineCard";
import DomainPill from "./DomainPill";

const TOPBAR_HEIGHT = 48;
const HEADER_HEIGHT = 130;
const VIEWPORT_TOP_GAP = 64;
const VIEWPORT_BOTTOM_GAP = 64;

const FD_SPACING = GAP;
const CLUSTER_GAP = 232;
const CLUSTER_INTERNAL_SPACING = 52;
const FD_TOP_PADDING = 120;
const FD_BOTTOM_PADDING = 72;
const DOMAIN_RIGHT_PADDING = 80;

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function fitBlockStart({ itemCount, spacing, visibleTop, visibleBottom }) {
  if (itemCount <= 0) return visibleTop;

  const blockHeight = (itemCount - 1) * spacing;
  const visibleCenter = (visibleTop + visibleBottom) / 2;

  const minStart = visibleTop;
  const maxStart = Math.max(visibleTop, visibleBottom - blockHeight);

  return clamp(visibleCenter - blockHeight / 2, minStart, maxStart);
}

function buildBaseLayout({
  domains,
  domainBaseX,
  visibleTop,
  visibleBottom,
  spacing,
}) {
  const startY = fitBlockStart({
    itemCount: domains.length,
    spacing,
    visibleTop,
    visibleBottom,
  });

  return domains.map((domain, index) => ({
    ...domain,
    x: domainBaseX,
    y: startY + index * spacing,
  }));
}

function buildFocusLayout({
  domains,
  selectedItem,
  selectedAnchor,
  domainBaseX,
  visibleTop,
  visibleBottom,
  spacing,
}) {
  if (!selectedItem || !selectedAnchor) {
    return buildBaseLayout({
      domains,
      domainBaseX,
      visibleTop,
      visibleBottom,
      spacing,
    });
  }

  const scoreMap = new Map(
    (selectedItem.domains?.functional || []).map((domain) => [
      `fd-${domain.code}`,
      domain.score || 0,
    ]),
  );

  const linked = domains
    .filter((domain) => scoreMap.has(domain.id))
    .map((domain) => ({
      ...domain,
      selectedScore: scoreMap.get(domain.id) || 0,
    }))
    .sort((a, b) => {
      if (b.selectedScore !== a.selectedScore) {
        return b.selectedScore - a.selectedScore;
      }
      return a.firstXpIndex - b.firstXpIndex;
    });

  const others = domains.filter((domain) => !scoreMap.has(domain.id));

  if (!linked.length) {
    return buildBaseLayout({
      domains,
      domainBaseX,
      visibleTop,
      visibleBottom,
      spacing,
    });
  }

  const clusterSpacing = CLUSTER_INTERNAL_SPACING;
  const clusterHeight = (linked.length - 1) * clusterSpacing;

  const clusterCenter = clamp(
    selectedAnchor.y,
    visibleTop + clusterHeight / 2,
    visibleBottom - clusterHeight / 2,
  );

  const clusterStart = clusterCenter - clusterHeight / 2;
  const clusterEnd = clusterCenter + clusterHeight / 2;

  const linkedPlaced = linked.map((domain, index) => ({
    ...domain,
    x: domainBaseX,
    y: clusterStart + index * clusterSpacing,
  }));

  const topZoneEnd = clusterStart - CLUSTER_GAP;
  const bottomZoneStart = clusterEnd + CLUSTER_GAP;

  const aboveCapacity = Math.max(
    0,
    Math.floor((topZoneEnd - visibleTop) / spacing) + 1,
  );

  const aboveCount = Math.min(others.length, aboveCapacity);

  const aboveStart =
    aboveCount > 0 ? topZoneEnd - (aboveCount - 1) * spacing : topZoneEnd;

  const belowStart = bottomZoneStart;

  const abovePlaced = others.slice(0, aboveCount).map((domain, index) => ({
    ...domain,
    x: domainBaseX,
    y: aboveStart + index * spacing,
  }));

  const belowPlaced = others.slice(aboveCount).map((domain, index) => ({
    ...domain,
    x: domainBaseX,
    y: belowStart + index * spacing,
  }));

  let combined = [...linkedPlaced, ...abovePlaced, ...belowPlaced];

  const minY = Math.min(...combined.map((d) => d.y));
  const maxY = Math.max(...combined.map((d) => d.y));

  let shift = 0;
  if (minY < visibleTop) {
    shift += visibleTop - minY;
  }
  if (maxY + shift > visibleBottom) {
    shift += visibleBottom - (maxY + shift);
  }

  combined = combined.map((domain) => ({
    ...domain,
    y: domain.y + shift,
  }));

  const byId = new Map(combined.map((domain) => [domain.id, domain]));

  return domains.map((domain) => byId.get(domain.id) || domain);
}

function createMotionNode(domain) {
  return {
    id: domain.id,
    x: motionValue(domain.x),
    y: motionValue(domain.y),
    stopX: null,
    stopY: null,
  };
}

export default function CareerGraphScene({
  timeline,
  canvasWidth,
  sceneHeight,
  domains,
  selectedItem,
  selectedXpId,
  xpAnchors,
  activeXpId,
  activeDomainIds,
  hoveredDomainId,
  setHoveredXpId,
  setHoveredDomainId,
  setSelectedXpId,
}) {
  const sceneRef = useRef(null);
  const motionNodesRef = useRef(new Map());
  const rafTickRef = useRef(null);
  const [frameTick, setFrameTick] = useState(0);
  const [hoveredTransition, setHoveredTransition] = useState(null);

  const [viewportState, setViewportState] = useState({
    top: FD_TOP_PADDING,
    bottom: Math.max(FD_TOP_PADDING, sceneHeight - FD_BOTTOM_PADDING),
  });

  const [smoothedVisibleCenter, setSmoothedVisibleCenter] = useState(null);

  const trajectoryTransitions = useMemo(
    () => buildTrajectoryTransitions(timeline),
    [timeline],
  );

  const transitionTooltip = useMemo(() => {
    if (!hoveredTransition) return null;

    const TOOLTIP_WIDTH = 300;
    const x = clamp(
      hoveredTransition.x - TOOLTIP_WIDTH / 2,
      48,
      canvasWidth - TOOLTIP_WIDTH + 16,
    );

    const y = Math.max(12, hoveredTransition.midY - 64);

    return {
      ...hoveredTransition,
      left: x,
      top: y,
      width: TOOLTIP_WIDTH,
    };
  }, [hoveredTransition, canvasWidth]);

  useEffect(() => {
    function updateViewport() {
      const rect = sceneRef.current?.getBoundingClientRect();
      if (!rect) return;

      const viewportTopPx = TOPBAR_HEIGHT + HEADER_HEIGHT + VIEWPORT_TOP_GAP;
      const viewportBottomPx = window.innerHeight - VIEWPORT_BOTTOM_GAP;

      const top = clamp(
        viewportTopPx - rect.top,
        FD_TOP_PADDING,
        Math.max(FD_TOP_PADDING, sceneHeight - FD_BOTTOM_PADDING),
      );

      const bottom = clamp(
        viewportBottomPx - rect.top,
        FD_TOP_PADDING,
        Math.max(FD_TOP_PADDING, sceneHeight - FD_BOTTOM_PADDING),
      );

      setViewportState({
        top,
        bottom: Math.max(top, bottom),
      });
    }

    updateViewport();
    window.addEventListener("scroll", updateViewport, { passive: true });
    window.addEventListener("resize", updateViewport);

    return () => {
      window.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [sceneHeight]);

  useEffect(() => {
    let rafId = null;
    let isMounted = true;

    function tick() {
      if (!isMounted) return;

      const targetCenter = (viewportState.top + viewportState.bottom) / 2;

      setSmoothedVisibleCenter((prev) => {
        const current = prev ?? targetCenter;
        const next = current + (targetCenter - current) * 0.18;
        return Math.abs(next - targetCenter) < 0.25 ? targetCenter : next;
      });

      rafId = requestAnimationFrame(tick);
    }

    rafId = requestAnimationFrame(tick);

    return () => {
      isMounted = false;
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [viewportState.top, viewportState.bottom]);

  const smoothedViewport = useMemo(() => {
    const height = Math.max(0, viewportState.bottom - viewportState.top);
    const center =
      smoothedVisibleCenter ?? (viewportState.top + viewportState.bottom) / 2;

    return {
      top: center - height / 2,
      bottom: center + height / 2,
    };
  }, [smoothedVisibleCenter, viewportState.top, viewportState.bottom]);

  const domainBaseX = canvasWidth - DOMAIN_WIDTH - DOMAIN_RIGHT_PADDING;

  const selectedAnchor = useMemo(
    () => xpAnchors.find((anchor) => anchor.id === selectedXpId) || null,
    [xpAnchors, selectedXpId],
  );

  const positionedDomains = useMemo(() => {
    if (selectedItem && selectedAnchor) {
      return buildFocusLayout({
        domains,
        selectedItem,
        selectedAnchor,
        domainBaseX,
        visibleTop: smoothedViewport.top,
        visibleBottom: smoothedViewport.bottom,
        spacing: FD_SPACING,
      });
    }

    return buildBaseLayout({
      domains,
      domainBaseX,
      visibleTop: smoothedViewport.top,
      visibleBottom: smoothedViewport.bottom,
      spacing: FD_SPACING,
    });
  }, [
    domains,
    selectedItem,
    selectedAnchor,
    domainBaseX,
    smoothedViewport.top,
    smoothedViewport.bottom,
  ]);

  // hydrate motion nodes
  useEffect(() => {
    const map = motionNodesRef.current;
    const currentIds = new Set(positionedDomains.map((d) => d.id));

    positionedDomains.forEach((domain) => {
      if (!map.has(domain.id)) {
        map.set(domain.id, createMotionNode(domain));
      }
    });

    Array.from(map.keys()).forEach((id) => {
      if (!currentIds.has(id)) {
        const node = map.get(id);
        node?.stopX?.();
        node?.stopY?.();
        map.delete(id);
      }
    });
  }, [positionedDomains]);

  // animate nodes to new targets
  useEffect(() => {
    const map = motionNodesRef.current;

    positionedDomains.forEach((domain) => {
      const node = map.get(domain.id);
      if (!node) return;

      node.stopX?.();
      node.stopY?.();

      const controlsX = animate(node.x, domain.x, MOTION.spring.position);
      const controlsY = animate(node.y, domain.y, MOTION.spring.position);

      node.stopX = controlsX.stop;
      node.stopY = controlsY.stop;
    });

    return () => {
      positionedDomains.forEach((domain) => {
        const node = map.get(domain.id);
        node?.stopX?.();
        node?.stopY?.();
      });
    };
  }, [positionedDomains]);

  // rerender links from live motion values
  useEffect(() => {
    const map = motionNodesRef.current;
    const unsubscribers = [];

    function scheduleFrame() {
      if (rafTickRef.current != null) return;

      rafTickRef.current = requestAnimationFrame(() => {
        rafTickRef.current = null;
        setFrameTick((v) => v + 1);
      });
    }

    map.forEach((node) => {
      unsubscribers.push(
        node.x.on("change", scheduleFrame),
        node.y.on("change", scheduleFrame),
      );
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      if (rafTickRef.current != null) {
        cancelAnimationFrame(rafTickRef.current);
        rafTickRef.current = null;
      }
    };
  }, [positionedDomains]);

  const liveDomains = useMemo(() => {
    void frameTick;

    const map = motionNodesRef.current;

    return positionedDomains.map((domain) => {
      const node = map.get(domain.id);

      return {
        ...domain,
        liveX: node ? node.x.get() : domain.x,
        liveY: node ? node.y.get() : domain.y,
      };
    });
  }, [positionedDomains, frameTick]);

  const linkPaths = useMemo(() => {
    const xpVisualAnchorMap = new Map(
      timeline.steps
        .filter((step) => step.type === "xp")
        .map((step) => [step.xp.id, getXpVisualLinkAnchor(step)]),
    );

    return liveDomains.flatMap((domain) =>
      domain.xpIds
        .map((xpId) => {
          const anchor = xpVisualAnchorMap.get(xpId);
          if (!anchor) return null;

          const isActiveFromXp =
            activeXpId === xpId && activeDomainIds.has(domain.id);
          const isActiveFromDomain = hoveredDomainId === domain.id;

          return {
            id: `${xpId}-${domain.id}`,
            d: buildLinkPath(
              anchor.x,
              anchor.y,
              domain.liveX,
              domain.liveY + DOMAIN_CENTER_Y,
            ),
            active: isActiveFromXp || isActiveFromDomain,
          };
        })
        .filter(Boolean),
    );
  }, [
    timeline.steps,
    liveDomains,
    activeXpId,
    activeDomainIds,
    hoveredDomainId,
  ]);

  return (
    <div
      ref={sceneRef}
      className="relative"
      style={{
        width: canvasWidth,
        height: sceneHeight,
      }}
    >
      <TimelineAxis
        totalHeight={sceneHeight}
        xpAnchors={xpAnchors}
        laneCount={timeline.laneCount}
        linkPaths={linkPaths}
        trajectoryTransitions={trajectoryTransitions}
        canvasWidth={canvasWidth}
        onTransitionEnter={setHoveredTransition}
        onTransitionLeave={() => setHoveredTransition(null)}
      />

      {transitionTooltip ? (
        <div
          className="pointer-events-none absolute z-30"
          style={{
            left: transitionTooltip.left,
            top: transitionTooltip.top,
            width: transitionTooltip.width,
          }}
        >
          <div className="rounded-xl border border-zinc-200 bg-white/96 px-3 py-2 shadow-lg backdrop-blur-sm">
            {/* HEADLINE */}
            {transitionTooltip.insight?.headline && (
              <div className="text-[11px] font-medium text-zinc-500">
                {transitionTooltip.insight.headline}
              </div>
            )}

            {/* TITLE */}
            <div className="mt-1 text-[12px] font-semibold text-zinc-900">
              {transitionTooltip.insight?.title}
            </div>

            {/* BODY */}
            <div className="mt-1 text-[11px] leading-4 text-zinc-600">
              {transitionTooltip.insight?.body}
            </div>

            {/* META */}
            {transitionTooltip.insight?.meta && (
              <div className="mt-2 text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                {transitionTooltip.insight.meta}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <SecondaryLaneRanges
        steps={timeline.steps}
        canvasWidth={canvasWidth}
        totalHeight={sceneHeight}
      />

      <div className="pointer-events-none absolute left-0 py-3 z-10 w-full">
        <div
          className="absolute text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
          style={{
            left: SPEC.cardX,
            width: SPEC.cardWidth,
            textAlign: "center",
          }}
        >
          Trajectoire principale
        </div>

        {timeline.laneCount > 1 ? (
          <div
            className="absolute text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
            style={{
              left: SPEC.cardX + getLaneOffsetX(1) - 40,
              width: SPEC.cardWidth,
              textAlign: "center",
            }}
          >
            Engagements parallèles
          </div>
        ) : null}

        <div
          className="absolute text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400"
          style={{
            left: canvasWidth - DOMAIN_WIDTH - DOMAIN_RIGHT_PADDING,
            width: DOMAIN_WIDTH,
            textAlign: "center",
          }}
        >
          Domaines fonctionnels
        </div>
      </div>

      {timeline.steps.map((step, index) => {
        if (step.type === "date") {
          if (step.lane > 0) return null;

          return (
            <TimelineDate
              key={`${step.lane}-${step.value}-${index}`}
              value={step.value}
              y={step.y}
              lane={step.lane || 0}
            />
          );
        }

        if (step.lane > 0) {
          return (
            <TimelineCardSecondary
              key={step.xp.id}
              item={step.xp}
              y={step.y}
              lane={step.lane || 1}
              isActive={activeXpId === step.xp.id}
              onMouseEnter={() => setHoveredXpId(step.xp.id)}
              onMouseLeave={() => setHoveredXpId(null)}
              onClick={() => setSelectedXpId(step.xp.id)}
            />
          );
        }

        return (
          <TimelineCard
            key={step.xp.id}
            item={step.xp}
            y={step.y}
            lane={step.lane || 0}
            isActive={activeXpId === step.xp.id}
            onMouseEnter={() => setHoveredXpId(step.xp.id)}
            onMouseLeave={() => setHoveredXpId(null)}
            onClick={() => setSelectedXpId(step.xp.id)}
          />
        );
      })}

      {positionedDomains.map((domain) => {
        const motionNode = motionNodesRef.current.get(domain.id);
        if (!motionNode) return null;

        return (
          <DomainPill
            key={domain.id}
            domain={domain}
            motionNode={motionNode}
            isActive={
              activeDomainIds.has(domain.id) || hoveredDomainId === domain.id
            }
            onMouseEnter={() => setHoveredDomainId(domain.id)}
            onMouseLeave={() => setHoveredDomainId(null)}
            onClick={() =>
              setHoveredDomainId((prev) =>
                prev === domain.id ? null : domain.id,
              )
            }
          />
        );
      })}
    </div>
  );
}
