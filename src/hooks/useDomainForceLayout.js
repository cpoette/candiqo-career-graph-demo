/* eslint-disable react-hooks/refs */
import { useEffect, useMemo, useRef, useState } from "react";
import { forceCollide, forceSimulation, forceX, forceY } from "d3-force";
import { DOMAIN_HEIGHT } from "@/lib/careerGraph.constants";

/* =========================
 * TUNING CONSTANTS
 * ========================= */

// cluster build
const CLUSTER_COMPACT_SPACING_DELTA = -5; // spacing - 10
const CLUSTER_TOP_PADDING_FACTOR = 1;
const CLUSTER_BOTTOM_PADDING_FACTOR = 0.7;
const CLUSTER_CENTER_BIAS_FACTOR = 0;
const LINKED_TARGET_STRENGTH_Y = 0.6;
const LINKED_COLLISION_RADIUS_FACTOR = 1;

// non-linked target behavior
const INSIDE_BAND_TARGET_STRENGTH_Y = 0.12;
const OUTSIDE_BASE_TARGET_STRENGTH_Y = 0.06;
const OUTSIDE_LOCAL_WEIGHT_TARGET_GAIN = 0.05;
const LOCAL_WEIGHT_DISTANCE = 220;
const NON_LINKED_COLLISION_RADIUS_BASE = 1;
const NON_LINKED_COLLISION_RADIUS_GAIN = 0.04;

// simulation
const SIM_ALPHA_ACTIVE = 0.15;
const SIM_ALPHA_IDLE = 0.1;
const SIM_ALPHA_DECAY = 0.08;
const SIM_VELOCITY_DECAY = 0.5;
const FORCE_X_STRENGTH = 0;
const FORCE_COLLIDE_STRENGTH = 0;
const FORCE_COLLIDE_ITERATIONS = 0;

// linked smooth motion
const LINKED_Y_ATTRACTION = 0.045;
const LINKED_Y_DAMPING = 0.84;
const LINKED_X_ATTRACTION = 0.0;
const LINKED_X_DAMPING = 0.84;
const LINKED_FORCE_Y_IN_SIM = 0.5;

// post-processing
const SEPARATED_CLUSTER_GAP_FACTOR = 1.5;
const SEPARATED_CORE_FACTOR = 0.4;
const SEPARATED_HALO_FACTOR = 1;

const PRIORITY_COLLISION_GAP_FACTOR = 1.5;
const PRIORITY_COLLISION_PASSES = 4;
const PRIORITY_DOMINANT_SHARE = 0.92;
const PRIORITY_WEAK_SHARE = 0.08;

const FINAL_OVERLAP_GAP_FACTOR = 1.5;
const FINAL_OVERLAP_PASSES = 3;

// priority thresholds
const LOCAL_WEIGHT_PRIORITY_THRESHOLD = 0.2;

/* =========================
 * HELPERS
 * ========================= */

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

function buildSelectedScoreMap(selectedItem) {
  return new Map(
    (selectedItem?.domains?.functional || []).map((domain) => [
      `fd-${domain.code}`,
      domain.score || 0,
    ]),
  );
}

function buildTargets({
  domains,
  selectedItem,
  selectedAnchor,
  spacing,
  topPadding,
  bottomPadding,
  totalHeight,
}) {
  const scoreMap = buildSelectedScoreMap(selectedItem);
  const maxY = Math.max(topPadding, totalHeight - bottomPadding);

  if (!selectedItem || !selectedAnchor || !scoreMap.size) {
    return domains.map((domain) => ({
      ...domain,
      targetX: domain.baseX,
      targetY: domain.baseY,
      isLinked: false,
      selectedScore: 0,
      targetStrengthX: FORCE_X_STRENGTH,
      targetStrengthY: OUTSIDE_BASE_TARGET_STRENGTH_Y,
      collisionRadius: DOMAIN_HEIGHT * NON_LINKED_COLLISION_RADIUS_BASE,
      localWeight: 0,
      clusterZone: "none",
    }));
  }

  const linked = domains
    .filter((domain) => scoreMap.has(domain.id))
    .map((domain) => ({
      ...domain,
      isLinked: true,
      selectedScore: scoreMap.get(domain.id) || 0,
    }))
    .sort((a, b) => {
      if (b.selectedScore !== a.selectedScore) {
        return b.selectedScore - a.selectedScore;
      }
      return a.firstXpIndex - b.firstXpIndex;
    });

  //const linkedIds = new Set(linked.map((domain) => domain.id));
  const count = linked.length;
  const compactSpacing = Math.max(42, spacing - CLUSTER_COMPACT_SPACING_DELTA);
  const startY = selectedAnchor.y - ((count - 1) * compactSpacing) / 2;

  const clusterTop = clamp(
    startY - compactSpacing * CLUSTER_TOP_PADDING_FACTOR,
    topPadding,
    maxY,
  );
  const clusterBottom = clamp(
    startY +
      (count - 1) * compactSpacing +
      compactSpacing * CLUSTER_BOTTOM_PADDING_FACTOR,
    topPadding,
    maxY,
  );
  const clusterMid = (clusterTop + clusterBottom) / 2;

  const targetById = new Map();

  linked.forEach((domain, index) => {
    const rawY = startY + index * compactSpacing;
    const centerBias =
      count > 1
        ? (0.5 - index / (count - 1)) *
          CLUSTER_CENTER_BIAS_FACTOR *
          (domain.selectedScore || 0)
        : 0;

    targetById.set(domain.id, {
      targetX: domain.baseX,
      targetY: clamp(rawY + centerBias, topPadding, maxY),
      isLinked: true,
      selectedScore: domain.selectedScore || 0,
      targetStrengthX: FORCE_X_STRENGTH,
      targetStrengthY: LINKED_TARGET_STRENGTH_Y,
      collisionRadius: DOMAIN_HEIGHT * LINKED_COLLISION_RADIUS_FACTOR,
      localWeight: 1,
      clusterZone: "inside",
    });
  });

  return domains.map((domain) => {
    const linkedTarget = targetById.get(domain.id);
    if (linkedTarget) {
      return {
        ...domain,
        ...linkedTarget,
      };
    }

    const baseY = domain.baseY;
    let targetY = baseY;
    let clusterZone = "outside";

    if (baseY >= clusterTop && baseY <= clusterBottom) {
      clusterZone = "inside-band";
      const goesAbove = baseY < clusterMid;
      targetY = goesAbove
        ? clusterTop - compactSpacing * 0.9
        : clusterBottom + compactSpacing * 0.9;
    }

    const distToBand =
      baseY < clusterTop
        ? clusterTop - baseY
        : baseY > clusterBottom
          ? baseY - clusterBottom
          : 0;

    const localWeight = Math.max(0, 1 - distToBand / LOCAL_WEIGHT_DISTANCE);

    return {
      ...domain,
      targetX: domain.baseX,
      targetY: clamp(targetY, topPadding, maxY),
      isLinked: false,
      selectedScore: 0,
      targetStrengthX: FORCE_X_STRENGTH,
      targetStrengthY:
        clusterZone === "inside-band"
          ? INSIDE_BAND_TARGET_STRENGTH_Y
          : OUTSIDE_BASE_TARGET_STRENGTH_Y +
            localWeight * OUTSIDE_LOCAL_WEIGHT_TARGET_GAIN,
      collisionRadius:
        DOMAIN_HEIGHT *
        (NON_LINKED_COLLISION_RADIUS_BASE +
          localWeight * NON_LINKED_COLLISION_RADIUS_GAIN),
      localWeight,
      clusterZone,
    };
  });
}

function resolveSeparatedCluster(
  nodes,
  gap = DOMAIN_HEIGHT * SEPARATED_CLUSTER_GAP_FACTOR,
) {
  const next = [...nodes];
  const linked = next.filter((n) => n.isLinked).sort((a, b) => a.y - b.y);
  if (!linked.length) return next;

  const coreTop = linked[0].y - gap * SEPARATED_CORE_FACTOR;
  const coreBottom = linked[linked.length - 1].y + gap * SEPARATED_CORE_FACTOR;
  const haloTop = coreTop - gap * SEPARATED_HALO_FACTOR;
  const haloBottom = coreBottom + gap * SEPARATED_HALO_FACTOR;
  const clusterMid = (coreTop + coreBottom) / 2;

  next.forEach((node) => {
    if (node.isLinked) return;

    if (node.y >= coreTop && node.y <= coreBottom) {
      const goesAbove = node.baseY < clusterMid;
      node.y = goesAbove ? haloTop : haloBottom;
      return;
    }

    if (node.y >= haloTop && node.y <= haloBottom) {
      const distToTop = Math.abs(node.y - coreTop);
      const distToBottom = Math.abs(node.y - coreBottom);

      if (distToTop < gap * SEPARATED_CORE_FACTOR) {
        node.y = coreTop - gap * SEPARATED_CORE_FACTOR;
      } else if (distToBottom < gap * SEPARATED_CORE_FACTOR) {
        node.y = coreBottom + gap * SEPARATED_CORE_FACTOR;
      }
    }
  });

  return next;
}

function resolvePriorityCollisions(
  nodes,
  gap = DOMAIN_HEIGHT * PRIORITY_COLLISION_GAP_FACTOR,
  passes = PRIORITY_COLLISION_PASSES,
) {
  const next = [...nodes];

  for (let pass = 0; pass < passes; pass += 1) {
    next.sort((a, b) => a.y - b.y);

    for (let i = 0; i < next.length - 1; i += 1) {
      const a = next[i];
      const b = next[i + 1];

      const delta = b.y - a.y;
      if (delta >= gap) continue;

      const overlap = gap - delta;

      const aPriority = a.isLinked
        ? 3
        : a.localWeight > LOCAL_WEIGHT_PRIORITY_THRESHOLD
          ? 1
          : 0;
      const bPriority = b.isLinked
        ? 3
        : b.localWeight > LOCAL_WEIGHT_PRIORITY_THRESHOLD
          ? 1
          : 0;

      if (aPriority > bPriority) {
        b.y += overlap * PRIORITY_DOMINANT_SHARE;
        a.y -= overlap * PRIORITY_WEAK_SHARE;
      } else if (bPriority > aPriority) {
        a.y -= overlap * PRIORITY_DOMINANT_SHARE;
        b.y += overlap * PRIORITY_WEAK_SHARE;
      } else {
        a.y -= overlap * 0.5;
        b.y += overlap * 0.5;
      }
    }
  }

  return next;
}

function resolveFinalOverlaps(
  nodes,
  gap = DOMAIN_HEIGHT * FINAL_OVERLAP_GAP_FACTOR,
  passes = FINAL_OVERLAP_PASSES,
) {
  const next = [...nodes];

  for (let pass = 0; pass < passes; pass += 1) {
    next.sort((a, b) => a.y - b.y);

    for (let i = 0; i < next.length - 1; i += 1) {
      const a = next[i];
      const b = next[i + 1];
      const delta = b.y - a.y;

      if (delta >= gap) continue;

      const overlap = gap - delta;

      if (a.isLinked && !b.isLinked) {
        b.y += overlap;
      } else if (!a.isLinked && b.isLinked) {
        a.y -= overlap;
      } else {
        a.y -= overlap * 0.5;
        b.y += overlap * 0.5;
      }
    }
  }

  return next;
}

/* =========================
 * HOOK
 * ========================= */

export default function useDomainForceLayout({
  domains = [],
  selectedItem = null,
  xpAnchors = [],
  selectedXpId = null,
  spacing = 56,
  topPadding = 72,
  bottomPadding = 72,
  totalHeight = 1200,
}) {
  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const [tick, setTick] = useState(0);

  const selectedAnchor = useMemo(
    () => xpAnchors.find((anchor) => anchor.id === selectedXpId) || null,
    [xpAnchors, selectedXpId],
  );

  const targetDomains = useMemo(
    () =>
      buildTargets({
        domains,
        selectedItem,
        selectedAnchor,
        spacing,
        topPadding,
        bottomPadding,
        totalHeight,
      }),
    [
      domains,
      selectedItem,
      selectedAnchor,
      spacing,
      topPadding,
      bottomPadding,
      totalHeight,
    ],
  );

  useEffect(() => {
    const prevById = new Map(nodesRef.current.map((node) => [node.id, node]));

    nodesRef.current = targetDomains.map((domain) => {
      const prev = prevById.get(domain.id);

      return {
        id: domain.id,
        xpIds: domain.xpIds,
        label: domain.label,
        firstXpIndex: domain.firstXpIndex,
        domain,
        x: prev?.x ?? domain.baseX,
        y: prev?.y ?? domain.baseY,
        vx: prev?.vx ?? 0,
        vy: prev?.vy ?? 0,
        targetX: domain.targetX,
        targetY: domain.targetY,
        baseX: domain.baseX,
        baseY: domain.baseY,
        isLinked: domain.isLinked,
        selectedScore: domain.selectedScore,
        targetStrengthX: domain.targetStrengthX,
        targetStrengthY: domain.targetStrengthY,
        collisionRadius: domain.collisionRadius,
        localWeight: domain.localWeight,
        clusterZone: domain.clusterZone,
      };
    });
  }, [targetDomains]);

  useEffect(() => {
    const nodes = nodesRef.current;
    if (!nodes.length) return undefined;

    simulationRef.current?.stop();

    const sim = forceSimulation(nodes)
      .alpha(selectedXpId ? SIM_ALPHA_ACTIVE : SIM_ALPHA_IDLE)
      .alphaDecay(SIM_ALPHA_DECAY)
      .velocityDecay(SIM_VELOCITY_DECAY)
      .force("x", forceX((node) => node.targetX).strength(FORCE_X_STRENGTH))
      .force(
        "y",
        forceY((node) => node.targetY).strength((node) =>
          node.isLinked
            ? LINKED_FORCE_Y_IN_SIM
            : (node.targetStrengthY ?? OUTSIDE_BASE_TARGET_STRENGTH_Y),
        ),
      )
      .force(
        "collide",
        forceCollide(
          (node) =>
            node.collisionRadius ??
            DOMAIN_HEIGHT * NON_LINKED_COLLISION_RADIUS_BASE,
        )
          .strength(FORCE_COLLIDE_STRENGTH)
          .iterations(FORCE_COLLIDE_ITERATIONS),
      )
      .on("tick", () => {
        nodesRef.current.forEach((node) => {
          if (!node.isLinked) return;

          node.vy += (node.targetY - node.y) * LINKED_Y_ATTRACTION;
          node.vy *= LINKED_Y_DAMPING;
          node.y += node.vy;

          node.vx += (node.targetX - node.x) * LINKED_X_ATTRACTION;
          node.vx *= LINKED_X_DAMPING;
          node.x += node.vx;
        });

        let next = resolveSeparatedCluster(nodesRef.current);
        next = resolvePriorityCollisions(next);
        next = resolveFinalOverlaps(next);

        nodesRef.current = next;
        setTick((v) => v + 1);
      });

    simulationRef.current = sim;

    return () => {
      sim.stop();
    };
  }, [targetDomains, selectedXpId]);

  const liveDomains = useMemo(() => {
    void tick;

    const byId = new Map(
      nodesRef.current.map((node) => [
        node.id,
        {
          ...node.domain,
          x: node.x,
          y: node.y,
          liveX: node.x,
          liveY: node.y,
          isLinked: node.isLinked,
          selectedScore: node.selectedScore,
          localWeight: node.localWeight,
        },
      ]),
    );

    return domains.map((domain) => byId.get(domain.id) || domain);
  }, [tick, domains]);

  return liveDomains;
}
