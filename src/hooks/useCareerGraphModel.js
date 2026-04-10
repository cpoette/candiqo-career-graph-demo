/* eslint-disable react-hooks/refs */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SPEC,
  LANE_WIDTH,
  GAP,
  DOMAIN_WIDTH,
  DOMAIN_X_OFFSET,
  sortXp,
  normalizeTimelineItems,
  assignLanes,
  buildTimelineStepsByLane,
  computeTimelineLayoutByLane,
  groupItemsByLane,
  getDotRadius,
  collectFunctionalDomains,
  getDomainPillY,
  computeAlignedDomainPositions,
} from "@/lib/careerGraph.layout";

import {
  CAREER_GRAPH_MIN_HEIGHT,
  FD_STACK_BOTTOM_PADDING,
  FD_STACK_TOP_PADDING,
  DOMAIN_GAP,
  DOMAIN_HEIGHT,
} from "@/lib/careerGraph.constants";

export default function useCareerGraphModel(data = {}) {
  const [hoveredXpId, setHoveredXpId] = useState(null);
  const [hoveredDomainId, setHoveredDomainId] = useState(null);
  const [selectedXpId, setSelectedXpId] = useState(null);

  const lastPositionsRef = useRef(new Map());

  // =========================
  // XP PIPELINE
  // =========================

  const items = useMemo(() => {
    const sorted = sortXp(data);
    const normalized = normalizeTimelineItems(sorted);
    return assignLanes(normalized);
  }, [data]);

  const laneItemsMap = useMemo(() => groupItemsByLane(items), [items]);

  const laneSteps = useMemo(() => buildTimelineStepsByLane(items), [items]);

  const timeline = useMemo(
    () => computeTimelineLayoutByLane(laneSteps, laneItemsMap),
    [laneSteps, laneItemsMap],
  );

  // =========================
  // SELECTION
  // =========================

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedXpId) || null,
    [items, selectedXpId],
  );

  const activeXpId = selectedXpId || hoveredXpId;

  // =========================
  // XP ANCHORS
  // =========================

  const xpAnchors = useMemo(
    () =>
      timeline.steps
        .filter((step) => step.type === "xp")
        .map((step) => ({
          id: step.xp.id,
          y: step.anchorY,
          lane: step.lane || 0,
          r: getDotRadius(step.xp),
          active: activeXpId === step.xp.id,
        })),
    [timeline, activeXpId],
  );

  // =========================
  // DOMAINS (BASE)
  // =========================

  const domains = useMemo(() => collectFunctionalDomains(items), [items]);

  // =========================
  // CANVAS
  // =========================

  const domainX =
    timeline.laneCount > 1 ? DOMAIN_X_OFFSET - 40 : DOMAIN_X_OFFSET;

  const canvasWidth =
    SPEC.cardX +
    SPEC.cardWidth +
    (timeline.laneCount - 1) * (LANE_WIDTH + GAP) +
    domainX +
    DOMAIN_WIDTH +
    80;

  const domainBaseX =
    SPEC.cardX +
    SPEC.cardWidth +
    (timeline.laneCount - 1) * (LANE_WIDTH + GAP) +
    domainX;

  // =========================
  // BASE DOMAIN POSITIONS
  // =========================

  const baseDomainPositions = useMemo(
    () =>
      domains.map((domain, index) => {
        const baseX = domainBaseX;
        const baseY = getDomainPillY(index);

        return {
          ...domain,
          baseX,
          baseY,
          x: baseX,
          y: baseY,
        };
      }),
    [domains, domainBaseX],
  );

  const minHeightFromDomains = useMemo(() => {
    const count = domains.length || 0;
    if (!count) return 0;

    return (
      FD_STACK_TOP_PADDING +
      FD_STACK_BOTTOM_PADDING +
      Math.max(0, count - 1) * DOMAIN_GAP +
      DOMAIN_HEIGHT
    );
  }, [domains]);

  const sceneHeight = useMemo(() => {
    return Math.max(
      timeline.totalHeight,
      minHeightFromDomains,
      CAREER_GRAPH_MIN_HEIGHT,
    );
  }, [timeline.totalHeight, minHeightFromDomains]);
  // =========================
  // ACTIVE DOMAINS
  // =========================

  const activeDomainIds = useMemo(() => {
    if (hoveredDomainId) return new Set([hoveredDomainId]);
    if (!activeXpId) return new Set();

    const xp = items.find((item) => item.id === activeXpId);

    return new Set((xp?.domains?.functional || []).map((d) => `fd-${d.code}`));
  }, [hoveredDomainId, activeXpId, items]);

  // =========================
  // ALIGNMENT
  // =========================

  const alignedDomainPositions = useMemo(() => {
    const selected = selectedItem;
    const selectedAnchor =
      xpAnchors.find((anchor) => anchor.id === selectedXpId) || null;

    const computed = computeAlignedDomainPositions({
      baseDomains: baseDomainPositions,
      selectedXp: selected,
      selectedAnchor,
      totalHeight: timeline.totalHeight,
      topPadding: 72,
      bottomPadding: 72,
      spacing: 56,
    });

    return computed.map((domain) => {
      const prev = lastPositionsRef.current.get(domain.id);

      return {
        ...domain,
        prevX: prev?.x ?? domain.baseX ?? domain.x,
        prevY: prev?.y ?? domain.baseY ?? domain.y,
      };
    });
  }, [
    baseDomainPositions,
    selectedItem,
    selectedXpId,
    xpAnchors,
    timeline.totalHeight,
  ]);

  // =========================
  // POSITION MEMORY
  // =========================

  useEffect(() => {
    alignedDomainPositions.forEach((domain) => {
      lastPositionsRef.current.set(domain.id, {
        x: domain.x,
        y: domain.y,
      });
    });
  }, [alignedDomainPositions]);

  // =========================
  // RESET UI ON DATA CHANGE
  // =========================
  useEffect(() => {
    setHoveredXpId(null);
    setHoveredDomainId(null);
    setSelectedXpId(null);
  }, [data]);

  // =========================
  // ACTIONS
  // =========================

  function handleCloseDrawer() {
    setSelectedXpId(null);
  }

  // =========================
  // RETURN
  // =========================

  return {
    hoveredXpId,
    setHoveredXpId,
    hoveredDomainId,
    setHoveredDomainId,
    selectedXpId,
    setSelectedXpId,
    sceneHeight,

    items,
    timeline,
    domains,
    selectedItem,
    activeXpId,
    activeDomainIds,
    xpAnchors,
    canvasWidth,
    alignedDomainPositions,

    handleCloseDrawer,
  };
}
