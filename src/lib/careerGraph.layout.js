import {
  SPEC,
  LANE_WIDTH,
  GAP,
  DOMAIN_WIDTH,
  DOMAIN_HEIGHT,
  DOMAIN_X_OFFSET,
  DOMAIN_CENTER_Y,
  DOMAIN_TOP,
  DOMAIN_GAP,
} from "./careerGraph.constants";

export {
  SPEC,
  LANE_WIDTH,
  GAP,
  DOMAIN_WIDTH,
  DOMAIN_HEIGHT,
  DOMAIN_X_OFFSET,
  DOMAIN_CENTER_Y,
  DOMAIN_TOP,
  DOMAIN_GAP,
};

export function clamp01(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

export function extractYear(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

export function sortXp(data) {
  return Object.entries(data || {})
    .map(([id, item]) => ({ id: String(id), ...item }))
    .sort((a, b) => {
      const aCurrent = Boolean(a?.identity?.is_current);
      const bCurrent = Boolean(b?.identity?.is_current);

      if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;

      const aStart =
        extractYear(a?.identity?.date_start) ?? a?.recency?.asof_year ?? 0;
      const bStart =
        extractYear(b?.identity?.date_start) ?? b?.recency?.asof_year ?? 0;

      if (aStart !== bStart) return bStart - aStart;

      const aEnd = aCurrent
        ? new Date().getFullYear()
        : (extractYear(a?.identity?.date_end) ?? aStart);

      const bEnd = bCurrent
        ? new Date().getFullYear()
        : (extractYear(b?.identity?.date_end) ?? bStart);

      if (aEnd !== bEnd) return bEnd - aEnd;

      return Number(b.id) - Number(a.id);
    });
}

export function getStartYear(item) {
  return (
    extractYear(item?.identity?.date_start) ?? item?.recency?.asof_year ?? null
  );
}

export function getEndYear(item) {
  if (item?.identity?.is_current) return null;
  return (
    extractYear(item?.identity?.date_end) ?? item?.recency?.asof_year ?? null
  );
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getStepXpRange(step) {
  const xp = step?.xp;
  const start = xp?.startYear ?? 0;
  const end =
    xp?.endYear ?? (xp?.identity?.is_current ? getCurrentYear() : start);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function isGapCoveredByParallelXp(fromStep, toStep, parallelSteps = []) {
  const fromRange = getStepXpRange(fromStep); // plus ancien
  const toRange = getStepXpRange(toStep); // plus récent

  // trou entre la fin de l'ancien et le début du récent
  const gapStart = fromRange.end;
  const gapEnd = toRange.start;

  if (gapEnd <= gapStart) return true; // pas de trou réel

  return parallelSteps.some((step) => {
    const p = getStepXpRange(step);

    // l'XP parallèle couvre tout ou partie significative du trou
    return p.start <= gapEnd && p.end >= gapStart;
  });
}

export function getSecondaryCardMetrics(lane) {
  const axisX = SPEC.timelineX + getLaneOffsetX(lane) + SPEC.cardWidth / 2;
  const width = SPEC.cardWidth - 56;
  const x = axisX - width / 2;

  return {
    axisX,
    width,
    x,
    rightX: x + width,
  };
}

export function getXpVisualLinkAnchor(step) {
  if (!step || step.type !== "xp") return null;

  // lane principale
  if ((step.lane || 0) === 0) {
    const x = SPEC.cardX + getLaneOffsetX(step.lane || 0) + SPEC.cardWidth;
    const y = step.y + SPEC.cardHeight / 2;

    return { x, y };
  }

  // lane secondaire
  const metrics = getSecondaryCardMetrics(step.lane || 1);

  return {
    x: metrics.rightX,
    y: step.y + SPEC.cardHeight / 2,
  };
}

function resolveProjectedLaneCollisions(steps, spec) {
  if (!steps.length) return steps;

  const sorted = [...steps].sort((a, b) => a.y - b.y);

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const minY = prev.y + spec.cardHeight + spec.baseGap;

    if (curr.y < minY) {
      const delta = minY - curr.y;
      curr.y = minY;
      curr.anchorY = curr.y + spec.cardHeight / 2;
      curr.rangeTopY += delta;
      curr.rangeBottomY += delta;
    }
  }

  for (let i = sorted.length - 2; i >= 0; i -= 1) {
    const curr = sorted[i];
    const next = sorted[i + 1];
    const maxY = next.y - spec.cardHeight - spec.baseGap;

    if (curr.baseY != null && curr.y > curr.baseY) {
      const nextY = Math.max(curr.baseY, Math.min(curr.y, maxY));
      const delta = nextY - curr.y;
      curr.y = nextY;
      curr.anchorY = curr.y + spec.cardHeight / 2;
      curr.rangeTopY += delta;
      curr.rangeBottomY += delta;
    }
  }

  return sorted;
}

export function normalizeTimelineItems(items) {
  return items.map((item) => ({
    ...item,
    startYear: getStartYear(item),
    endYear: getEndYear(item),
  }));
}

export function getXpRange(item) {
  const currentYear = new Date().getFullYear();

  const start = item?.startYear ?? 0;
  const end =
    item?.endYear ?? (item?.identity?.is_current ? currentYear : start);

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function overlapsXpInclusive(itemA, itemB) {
  const a = getXpRange(itemA);
  const b = getXpRange(itemB);

  return a.start <= b.end && a.end >= b.start;
}

export function computeSecondaryRange(mainXpSteps, secondaryXp, spec = SPEC) {
  if (!mainXpSteps?.length) {
    const top = spec.topPadding;
    return {
      topY: top,
      bottomY: top + spec.cardHeight,
      midY: top + spec.cardHeight / 2,
    };
  }

  const overlaps = mainXpSteps.filter((step) =>
    overlapsXpInclusive(secondaryXp, step.xp),
  );

  if (overlaps.length === 1) {
    const anchorY = overlaps[0].anchorY;
    return {
      topY: anchorY - spec.cardHeight / 2,
      bottomY: anchorY + spec.cardHeight / 2,
      midY: anchorY,
    };
  }

  if (overlaps.length > 1) {
    const sorted = [...overlaps].sort((a, b) => a.anchorY - b.anchorY);
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    return {
      topY: first.anchorY - spec.cardHeight / 2,
      bottomY: last.anchorY + spec.cardHeight / 2,
      midY: (first.anchorY + last.anchorY) / 2,
    };
  }

  const itemRange = getXpRange(secondaryXp);
  const sortedMain = [...mainXpSteps].sort((a, b) => a.anchorY - b.anchorY);

  for (let i = 0; i < sortedMain.length - 1; i += 1) {
    const upper = sortedMain[i];
    const lower = sortedMain[i + 1];

    const upperRange = getXpRange(upper.xp);
    const lowerRange = getXpRange(lower.xp);

    if (
      itemRange.end <= upperRange.start &&
      itemRange.start >= lowerRange.end
    ) {
      const midY = (upper.anchorY + lower.anchorY) / 2;
      return {
        topY: midY - spec.cardHeight / 2,
        bottomY: midY + spec.cardHeight / 2,
        midY,
      };
    }
  }

  const topMain = sortedMain[0];
  const bottomMain = sortedMain[sortedMain.length - 1];
  const topRange = getXpRange(topMain.xp);
  const bottomRange = getXpRange(bottomMain.xp);

  if (itemRange.start >= topRange.start) {
    return {
      topY: topMain.y,
      bottomY: topMain.y + spec.cardHeight,
      midY: topMain.anchorY,
    };
  }

  if (itemRange.end <= bottomRange.end) {
    const topY = bottomMain.y + spec.cardHeight + spec.baseGap;
    return {
      topY,
      bottomY: topY + spec.cardHeight,
      midY: topY + spec.cardHeight / 2,
    };
  }

  const fallbackTop = spec.topPadding;
  return {
    topY: fallbackTop,
    bottomY: fallbackTop + spec.cardHeight,
    midY: fallbackTop + spec.cardHeight / 2,
  };
}

function getItemDomainMap(item) {
  const map = new Map();

  (item?.domains?.functional || []).forEach((domain) => {
    map.set(domain.code, clamp01(domain.score || 0));
  });

  return map;
}

function buildGlobalCareerDomainMap(items) {
  const map = new Map();

  items.forEach((item) => {
    const recency = clamp01(item?.recency?.weight ?? 0.5);
    const duration = clamp01(item?.duration?.weight ?? 0.5);
    const weight = recency * 0.6 + duration * 0.4;

    (item?.domains?.functional || []).forEach((domain) => {
      const score = clamp01(domain.score || 0);
      map.set(domain.code, (map.get(domain.code) || 0) + score * weight);
    });
  });

  return map;
}

function computeDomainAlignment(item, globalMap) {
  const itemMap = getItemDomainMap(item);
  if (!itemMap.size || !globalMap.size) return 0;

  let dot = 0;
  let normItem = 0;
  let normGlobal = 0;

  const keys = new Set([...itemMap.keys(), ...globalMap.keys()]);

  keys.forEach((key) => {
    const a = itemMap.get(key) || 0;
    const b = globalMap.get(key) || 0;

    dot += a * b;
    normItem += a * a;
    normGlobal += b * b;
  });

  if (!normItem || !normGlobal) return 0;
  return dot / (Math.sqrt(normItem) * Math.sqrt(normGlobal));
}

function scoreStructuralXp(item, globalDomainMap) {
  const isCurrent = item?.identity?.is_current ? 1 : 0;
  const recency = clamp01(item?.recency?.weight ?? 0);
  const duration = clamp01(item?.duration?.weight ?? 0);
  const leadership = clamp01(item?.signals?.posture?.leadership ?? 0);
  const managerial = clamp01(item?.signals?.posture?.managerial_scope ?? 0);
  const strategic = clamp01(item?.signals?.level?.strategic_scope ?? 0);
  const domainAlignment = computeDomainAlignment(item, globalDomainMap);

  return (
    isCurrent * 2.2 +
    recency * 1.1 +
    duration * 0.7 +
    leadership * 0.8 +
    managerial * 0.7 +
    strategic * 0.6 +
    domainAlignment * 1.5
  );
}

function sortLaneItemsAntiChrono(items) {
  return [...items].sort((a, b) => {
    const aCurrent = Boolean(a?.identity?.is_current);
    const bCurrent = Boolean(b?.identity?.is_current);

    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;

    const aStart = a.startYear ?? 0;
    const bStart = b.startYear ?? 0;
    if (aStart !== bStart) return bStart - aStart;

    const currentYear = new Date().getFullYear();

    const aEnd = a.endYear ?? (aCurrent ? currentYear : aStart);
    const bEnd = b.endYear ?? (bCurrent ? currentYear : bStart);
    if (aEnd !== bEnd) return bEnd - aEnd;

    return Number(b.id) - Number(a.id);
  });
}

function overlapsInTime(a, b) {
  const currentYear = new Date().getFullYear();

  const aStart = a.startYear ?? 0;
  const aEnd = a.endYear ?? (a?.identity?.is_current ? currentYear : aStart);

  const bStart = b.startYear ?? 0;
  const bEnd = b.endYear ?? (b?.identity?.is_current ? currentYear : bStart);

  return !(aEnd <= bStart || aStart > bEnd);
}

export function assignLanes(items) {
  const sorted = sortLaneItemsAntiChrono(items);
  const globalDomainMap = buildGlobalCareerDomainMap(sorted);

  const scored = sorted.map((item) => ({
    ...item,
    structuralScore: scoreStructuralXp(item, globalDomainMap),
  }));

  const mainLane = [];
  const secondaryLane = [];

  scored.forEach((item) => {
    const conflictingMainItems = mainLane.filter((mainItem) =>
      overlapsInTime(item, mainItem),
    );

    // pas de conflit temporel avec la lane principale => lane principale
    if (!conflictingMainItems.length) {
      mainLane.push(item);
      return;
    }

    // on compare au conflit principal le plus fort
    const strongestConflict = conflictingMainItems.sort(
      (a, b) => b.structuralScore - a.structuralScore,
    )[0];

    if (item.structuralScore > strongestConflict.structuralScore) {
      const index = mainLane.findIndex((x) => x.id === strongestConflict.id);
      if (index !== -1) {
        mainLane[index] = item;
        secondaryLane.push(strongestConflict);
      } else {
        secondaryLane.push(item);
      }
    } else {
      secondaryLane.push(item);
    }
  });

  // ordre interne propre
  const mainSorted = sortLaneItemsAntiChrono(mainLane).map((item) => ({
    ...item,
    lane: 0,
  }));

  const secondarySorted = sortLaneItemsAntiChrono(secondaryLane).map(
    (item) => ({
      ...item,
      lane: 1,
    }),
  );

  return [...mainSorted, ...secondarySorted];
}

export function buildTimelineStepsByLane(items) {
  const byLane = new Map();

  items.forEach((item) => {
    const lane = item.lane || 0;
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push(item);
  });

  const laneSteps = new Map();

  Array.from(byLane.entries()).forEach(([lane, rawLaneItems]) => {
    const laneItems = sortLaneItemsAntiChrono(rawLaneItems);
    const steps = [];

    if (lane === 0) {
      steps.push({
        type: "date",
        value: "Aujourd'hui",
        xpId: null,
        role: "today",
        lane,
      });
    }

    for (let i = 0; i < laneItems.length; i += 1) {
      const current = laneItems[i];
      const upperYear = current?.identity?.is_current ? null : current.endYear;
      const lowerYear = current.startYear;

      if (upperYear != null) {
        steps.push({
          type: "date",
          value: String(upperYear),
          xpId: current.id,
          role: "upper",
          lane,
        });
      }

      steps.push({
        type: "xp",
        xp: current,
        lane,
      });

      if (lowerYear != null) {
        steps.push({
          type: "date",
          value: String(lowerYear),
          xpId: current.id,
          role: "lower",
          lane,
        });
      }
    }

    laneSteps.set(lane, mergeAdjacentDates(steps));
  });

  return laneSteps;
}

export function mergeAdjacentDates(steps) {
  const out = [];

  for (let i = 0; i < steps.length; i += 1) {
    const current = steps[i];
    const next = steps[i + 1];

    if (
      current.type === "date" &&
      next?.type === "date" &&
      current.value !== next.value &&
      current.value !== "Aujourd'hui" &&
      next.value !== "Aujourd'hui"
    ) {
      out.push({
        type: "date",
        value: `${next.value} → ${current.value}`,
        lane: current.lane,
      });
      i += 1;
      continue;
    }

    const prev = out[out.length - 1];
    if (
      current?.type === "date" &&
      prev?.type === "date" &&
      current.value === prev.value
    ) {
      continue;
    }

    out.push(current);
  }

  return out;
}

export function findPrevXp(steps, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (steps[i].type === "xp") return steps[i];
  }
  return null;
}

export function getLaneStartOffsetY(firstLaneYear, firstGlobalYear) {
  const deltaYears = Math.max(
    0,
    firstGlobalYear - (firstLaneYear ?? firstGlobalYear),
  );
  return Math.min(deltaYears * 28, 72);
}

export function getPrimaryDomainCode(item) {
  return item?.domains?.functional?.[0]?.code || null;
}

export function getPrimaryContextCode(item) {
  return item?.domains?.context?.[0]?.code || null;
}

export function computeStrongSharedFunctionalSignal(fromXp, toXp) {
  const fromDomains = fromXp?.domains?.functional || [];
  const toDomains = toXp?.domains?.functional || [];

  let strongestSharedScore = 0;

  fromDomains.forEach((fromDomain) => {
    const match = toDomains.find(
      (toDomain) => toDomain.code === fromDomain.code,
    );
    if (!match) return;

    const shared = Math.min(
      clamp01(fromDomain.score || 0),
      clamp01(match.score || 0),
    );

    if (shared > strongestSharedScore) {
      strongestSharedScore = shared;
    }
  });

  return strongestSharedScore;
}

export function getLeadershipScore(item) {
  return clamp01(
    item?.signals?.posture?.leadership ??
      item?.signals?.posture?.managerial_scope ??
      0,
  );
}

export function getStrategicScore(item) {
  return clamp01(item?.signals?.level?.strategic_scope ?? 0);
}

export function getManagerialScore(item) {
  return clamp01(item?.signals?.posture?.managerial_scope ?? 0);
}

export function getGapYears(fromXp, toXp) {
  // fromXp = plus ancien
  // toXp   = plus récent
  const fromEnd = getEndYear(fromXp) ?? getStartYear(fromXp);
  const toStart = getStartYear(toXp);

  if (fromEnd == null || toStart == null) return 0;

  return Math.max(0, toStart - fromEnd);
}

export function computeTransitionSignals(fromXp, toXp) {
  if (!fromXp || !toXp) {
    return {
      fromXpId: fromXp?.id ?? null,
      toXpId: toXp?.id ?? null,
      type: "normal",
      intensity: 0,
      signals: {
        domainShift: 0,
        leadershipDelta: 0,
        strategicDelta: 0,
        managerialDelta: 0,
        leadershipGain: 0,
        strategicGain: 0,
        managerialGain: 0,
        gapYears: 0,
      },
    };
  }

  const fromDomain = getPrimaryDomainCode(fromXp);
  const toDomain = getPrimaryDomainCode(toXp);

  const domainShift = fromDomain && toDomain && fromDomain !== toDomain ? 1 : 0;

  // deltas bruts
  const leadershipDelta = getLeadershipScore(toXp) - getLeadershipScore(fromXp);

  const strategicDelta = getStrategicScore(toXp) - getStrategicScore(fromXp);

  const managerialDelta = getManagerialScore(toXp) - getManagerialScore(fromXp);

  // gains positifs pour la logique de classification
  const leadershipGain = Math.max(0, leadershipDelta);
  const strategicGain = Math.max(0, strategicDelta);
  const managerialGain = Math.max(0, managerialDelta);

  const gapYears = getGapYears(fromXp, toXp);

  const pivotScore =
    domainShift * 0.45 +
    leadershipGain * 0.2 +
    strategicGain * 0.2 +
    managerialGain * 0.15;

  const riseScore =
    leadershipGain * 0.35 + strategicGain * 0.4 + managerialGain * 0.25;

  let type = "normal";
  let intensity = 0.25;

  if (gapYears >= 2 || (gapYears >= 1 && domainShift)) {
    type = "break";
    intensity = clamp01(0.5 + gapYears * 0.15 + domainShift * 0.2);
  } else if (pivotScore >= 0.55) {
    type = "pivot";
    intensity = clamp01(pivotScore);
  } else if (riseScore >= 0.22) {
    type = "rise";
    intensity = clamp01(riseScore);
  }

  return {
    fromXpId: fromXp.id,
    toXpId: toXp.id,
    type,
    intensity,
    signals: {
      domainShift,
      leadershipDelta,
      strategicDelta,
      managerialDelta,
      leadershipGain,
      strategicGain,
      managerialGain,
      gapYears,
    },
  };
}

function isSameCompany(fromXp, toXp) {
  const fromCompany = fromXp?.company;
  const toCompany = toXp?.company;

  // 1. SIREN
  if (fromCompany?.siren && toCompany?.siren) {
    return fromCompany.siren === toCompany.siren;
  }

  // 2. fallback name
  const normalize = (name) =>
    name
      ?.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const fromName = normalize(fromXp?.identity?.company_name);
  const toName = normalize(toXp?.identity?.company_name);

  return fromName && toName && fromName === toName;
}

export function computeTransitionType(fromXp, toXp, opts = {}) {
  const { gapCoveredByParallel = false } = opts;

  if (!fromXp || !toXp) {
    return {
      type: "normal",
      intensity: 0,
      debug: {},
    };
  }

  const sameContext =
    getPrimaryContextCode(fromXp) === getPrimaryContextCode(toXp);
  const strongSharedFunctionalSignal = computeStrongSharedFunctionalSignal(
    fromXp,
    toXp,
  );

  const fromLeadership = getLeadershipScore(fromXp);
  const toLeadership = getLeadershipScore(toXp);

  const fromStrategic = getStrategicScore(fromXp);
  const toStrategic = getStrategicScore(toXp);

  const fromManagerial = getManagerialScore(fromXp);
  const toManagerial = getManagerialScore(toXp);

  const leadershipDelta = toLeadership - fromLeadership;
  const strategicDelta = toStrategic - fromStrategic;
  const managerialDelta = toManagerial - fromManagerial;

  const gapYears = getGapYears(fromXp, toXp);
  const domainOverlap = computeDomainOverlap(fromXp, toXp);
  const sameCompany = isSameCompany(fromXp, toXp);

  const positiveLeadership = Math.max(0, leadershipDelta);
  const positiveStrategic = Math.max(0, strategicDelta);
  const positiveManagerial = Math.max(0, managerialDelta);

  const roleShiftScore =
    positiveLeadership * 0.4 +
    positiveStrategic * 0.35 +
    positiveManagerial * 0.25;

  const negativeLeadership = Math.max(0, -leadershipDelta);
  const negativeStrategic = Math.max(0, -strategicDelta);
  const negativeManagerial = Math.max(0, -managerialDelta);

  const recentrageScore =
    negativeLeadership * 0.4 +
    negativeStrategic * 0.35 +
    negativeManagerial * 0.25;

  const debugBase = {
    gapYears,
    domainOverlap,
    sameCompany,
    sameContext,
    strongSharedFunctionalSignal,
    gapCoveredByParallel,

    fromLeadership,
    toLeadership,
    leadershipDelta,

    fromStrategic,
    toStrategic,
    strategicDelta,

    fromManagerial,
    toManagerial,
    managerialDelta,

    roleShiftScore,
    recentrageScore,
  };

  // BREAK = vrai trou non couvert
  if (gapYears >= 2 && !gapCoveredByParallel) {
    return {
      type: "break",
      intensity: Math.min(1, 0.6 + gapYears * 0.1),
      debug: debugBase,
    };
  }

  // RISE = progression dans un socle cohérent
  const continuitySignal =
    sameCompany ||
    sameContext ||
    domainOverlap >= 0.28 ||
    strongSharedFunctionalSignal >= 0.6;

  if (roleShiftScore >= 0.2 && continuitySignal && gapYears === 0) {
    return {
      type: "rise",
      intensity: Math.min(1, roleShiftScore),
      debug: debugBase,
    };
  }

  // RECENTRAGE = mouvement vers un socle plus cohérent
  if (recentrageScore >= 0.2 && continuitySignal && gapYears === 0) {
    return {
      type: "recentrage",
      intensity: Math.min(1, recentrageScore),
      debug: debugBase,
    };
  }

  // PIVOT = faible overlap + mouvement réel
  if (
    domainOverlap < 0.22 &&
    !sameCompany &&
    !sameContext &&
    strongSharedFunctionalSignal < 0.5 &&
    roleShiftScore >= 0.14
  ) {
    return {
      type: "pivot",
      intensity: Math.min(1, (1 - domainOverlap) * 0.6 + roleShiftScore * 0.4),
      debug: debugBase,
    };
  }

  return {
    type: "normal",
    intensity: 0.2,
    debug: debugBase,
  };
}

export function buildTrajectoryTransitions(timeline) {
  const xpSteps = timeline.steps.filter((step) => step.type === "xp");

  // trajectoire principale uniquement
  const mainSteps = xpSteps
    .filter((step) => (step.lane || 0) === 0)
    .sort((a, b) => a.y - b.y); // top -> bottom (récent -> ancien)

  // XP parallèles pour couvrir les "gaps"
  const parallelSteps = xpSteps.filter((step) => (step.lane || 0) > 0);

  const transitions = [];

  for (let i = 0; i < mainSteps.length - 1; i += 1) {
    const upper = mainSteps[i]; // plus récent à l'écran
    const lower = mainSteps[i + 1]; // plus ancien à l'écran

    if (
      !upper?.xp ||
      !lower?.xp ||
      !Number.isFinite(upper.anchorY) ||
      !Number.isFinite(lower.anchorY)
    ) {
      continue;
    }

    // lecture réelle de trajectoire : ancien -> récent
    const gapCoveredByParallel = isGapCoveredByParallelXp(
      lower,
      upper,
      parallelSteps,
    );

    const { type, intensity, debug } = computeTransitionType(
      lower.xp,
      upper.xp,
      { gapCoveredByParallel },
    );

    const insight = buildTransitionInsight({
      type,
      debug,
      fromXp: lower.xp,
      toXp: upper.xp,
    });

    transitions.push({
      fromXpId: lower.xp.id,
      toXpId: upper.xp.id,
      fromLane: lower.lane || 0,
      toLane: upper.lane || 0,
      lane: 0,
      type,
      intensity,
      debug,
      insight,
      x: SPEC.timelineX + getLaneOffsetX(0),
      y1: upper.anchorY,
      y2: lower.anchorY,
      midY: upper.anchorY + (lower.anchorY - upper.anchorY) / 2,
    });
  }

  return transitions;
}

function formatJobTitle(title) {
  if (!title) return "";

  const clean = title.replace(/\s+/g, " ").trim();

  if (clean.length <= 40) return clean;

  return clean.slice(0, 37) + "…";
}

export function buildTransitionInsight({ type, debug, fromXp, toXp }) {
  const domainOverlap = debug?.domainOverlap ?? 1;
  const gapYears = debug?.gapYears || 0;

  const leadershipDelta = debug?.leadershipDelta ?? 0;
  const strategicDelta = debug?.strategicDelta ?? 0;
  const managerialDelta = debug?.managerialDelta ?? 0;

  const sameCompany = debug?.sameCompany ?? isSameCompany(fromXp, toXp);

  const negativeLeadership = Math.max(0, -(debug?.leadershipDelta ?? 0));
  const negativeStrategic = Math.max(0, -(debug?.strategicDelta ?? 0));
  const negativeManagerial = Math.max(0, -(debug?.managerialDelta ?? 0));

  const fromTitle = formatJobTitle(fromXp?.identity?.job_title);
  const toTitle = formatJobTitle(toXp?.identity?.job_title);

  const headline =
    fromTitle && toTitle ? `De “${fromTitle}” à “${toTitle}”` : null;

  if (type === "recentrage") {
    if (sameCompany) {
      return {
        headline,
        title: "Recentrage interne",
        body: "Le parcours évolue vers un rôle plus focalisé dans un environnement déjà connu.",
        meta: "Responsabilité plus resserrée, continuité forte",
      };
    }

    if (negativeStrategic >= negativeLeadership && negativeStrategic >= 0.2) {
      return {
        headline,
        title: "Recentrage opérationnel",
        body: "Le parcours revient vers un périmètre plus concret et plus focalisé.",
        meta: "Portée stratégique en retrait",
      };
    }

    if (negativeManagerial >= 0.2) {
      return {
        headline,
        title: "Resserrement de scope",
        body: "La trajectoire évolue vers un rôle avec moins d’encadrement direct.",
        meta: "Scope managérial en retrait",
      };
    }

    return {
      headline,
      title: "Recentrage",
      body: "Le parcours se recentre sur un périmètre plus ciblé tout en gardant une continuité métier.",
      meta: "Continuité forte, scope plus resserré",
    };
  }

  if (type === "rise") {
    if (
      sameCompany &&
      (managerialDelta >= 0.2 ||
        leadershipDelta >= 0.2 ||
        strategicDelta >= 0.2)
    ) {
      return {
        headline,
        title: "Progression interne",
        body: "Évolution vers un rôle plus structurant au sein du même environnement.",
        meta: "Leadership, management ou portée stratégique en hausse",
      };
    }

    if (strategicDelta > leadershipDelta && strategicDelta >= 0.2) {
      return {
        headline,
        title: "Montée en portée stratégique",
        body: "Le parcours évolue vers un rôle plus structurant dans le même fil de trajectoire.",
        meta: "Portée stratégique en hausse",
      };
    }

    if (managerialDelta >= 0.2) {
      return {
        headline,
        title: "Montée en responsabilité",
        body: "Progression vers un rôle avec davantage d’encadrement et de coordination.",
        meta: "Scope managérial en hausse",
      };
    }

    return {
      headline,
      title: "Progression",
      body: "Évolution cohérente dans la trajectoire principale.",
      meta: "Continuité métier",
    };
  }

  if (type === "pivot") {
    if (sameCompany) {
      return {
        headline,
        title: "Repositionnement interne",
        body: "Le parcours change de positionnement au sein du même environnement.",
        meta: "Évolution de rôle avec continuité d’entreprise",
      };
    }

    if (domainOverlap <= 0.2) {
      return {
        headline,
        title: "Changement de direction",
        body: "La trajectoire bascule vers un autre terrain fonctionnel.",
        meta: "Recouvrement métier faible",
      };
    }

    return {
      headline,
      title: "Repositionnement",
      body: "Le parcours évolue vers un nouveau positionnement sans rupture complète de continuité.",
      meta: "Changement de rôle perceptible",
    };
  }

  if (type === "break") {
    return {
      headline,
      title: "Rupture de trajectoire",
      body: "Une discontinuité temporelle visible sépare ces deux étapes du parcours.",
      meta: gapYears
        ? `Trou estimé : ${gapYears} an${gapYears > 1 ? "s" : ""}`
        : "",
    };
  }

  return {
    headline,
    title: "Continuité",
    body: "Transition fluide dans la trajectoire.",
    meta: "",
  };
}

export function getFunctionalDomainMap(item) {
  const entries = item?.domains?.functional || [];
  const map = new Map();

  entries.forEach((domain) => {
    map.set(domain.code, clamp01(domain.score || 0));
  });

  return map;
}

export function computeDomainOverlap(fromXp, toXp) {
  const a = getFunctionalDomainMap(fromXp);
  const b = getFunctionalDomainMap(toXp);

  const keys = new Set([...a.keys(), ...b.keys()]);
  if (!keys.size) return 0;

  let intersection = 0;
  let union = 0;

  keys.forEach((key) => {
    const av = a.get(key) || 0;
    const bv = b.get(key) || 0;

    intersection += Math.min(av, bv);
    union += Math.max(av, bv);
  });

  return union > 0 ? intersection / union : 0;
}

export function computeTimelineLayoutByLane(
  laneSteps,
  laneItemsMap,
  spec = SPEC,
) {
  const allSteps = [];
  const laneHeights = [];

  // =========================
  // LANE 0 = STRUCTURE PRINCIPALE
  // =========================

  const mainStepsRaw = laneSteps.get(0) || [];
  const mainItems = laneItemsMap.get(0) || [];

  const mainYears = mainItems
    .map((item) => item.startYear)
    .filter((v) => v != null);

  const firstMainYear = mainYears.length ? Math.max(...mainYears) : 0;

  let y = spec.topPadding + getLaneStartOffsetY(firstMainYear, firstMainYear);

  const mainLaidOut = [];

  for (let i = 0; i < mainStepsRaw.length; i += 1) {
    const step = mainStepsRaw[i];

    if (step.type === "date") {
      mainLaidOut.push({
        ...step,
        y,
        height: spec.dateHeight,
      });
      y += spec.dateHeight;
      if (i < mainStepsRaw.length - 1) y += spec.baseGap;
      continue;
    }

    const prevXp = findPrevXp(mainStepsRaw, i);
    const prevStart = prevXp ? getStartYear(prevXp.xp) : null;
    const currentEnd = getEndYear(step.xp) ?? getStartYear(step.xp);

    let extraGap = 0;

    if (prevXp && prevStart != null && currentEnd != null) {
      const missingYears = Math.max(0, prevStart - currentEnd);
      extraGap = Math.min(
        missingYears * spec.gapPerMissingYear,
        spec.maxExtraGap,
      );
    }

    y += extraGap;

    mainLaidOut.push({
      ...step,
      y,
      height: spec.cardHeight,
      anchorY: y + spec.cardHeight / 2,
    });

    y += spec.cardHeight;
    if (i < mainStepsRaw.length - 1) y += spec.baseGap;
  }

  laneHeights[0] = y + spec.bottomPadding;
  allSteps.push(...mainLaidOut);

  const mainXpSteps = mainLaidOut.filter((step) => step.type === "xp");

  // =========================
  // LANES SECONDAIRES = PROJECTION SUR LANE 0
  // =========================

  const secondaryLanes = Array.from(laneSteps.entries())
    .filter(([lane]) => lane !== 0)
    .sort((a, b) => a[0] - b[0]);

  secondaryLanes.forEach(([lane, rawSteps]) => {
    const secondaryXpSteps = rawSteps.filter((step) => step.type === "xp");

    const projectedXpSteps = secondaryXpSteps.map((step) => {
      const range = computeSecondaryRange(mainXpSteps, step.xp, spec);

      return {
        ...step,
        y: range.midY - spec.cardHeight / 2,
        baseY: range.midY - spec.cardHeight / 2,
        rangeTopY: range.topY,
        rangeBottomY: range.bottomY,
        height: spec.cardHeight,
        anchorY: range.midY,
      };
    });

    const resolvedXpSteps = resolveProjectedLaneCollisions(
      projectedXpSteps,
      spec,
    );

    const resolvedXpById = new Map(
      resolvedXpSteps.map((step) => [step.xp.id, step]),
    );

    const laidOut = [];

    rawSteps.forEach((step) => {
      if (step.type !== "xp") {
        return;
      }

      const projected = resolvedXpById.get(step.xp.id);
      if (projected) laidOut.push(projected);
    });

    const laneBottom =
      laidOut.length > 0
        ? Math.max(...laidOut.map((s) => s.y + s.height)) + spec.bottomPadding
        : spec.topPadding + spec.bottomPadding;

    laneHeights[lane] = laneBottom;
    allSteps.push(...laidOut);
  });

  const validLaneHeights = laneHeights.filter(Number.isFinite);

  return {
    steps: allSteps,
    totalHeight: Math.max(
      ...validLaneHeights,
      spec.topPadding + spec.bottomPadding,
    ),
    laneCount: Math.max(1, ...Array.from(laneSteps.keys()).map((k) => k + 1)),
  };
}

export function groupItemsByLane(items) {
  const map = new Map();

  items.forEach((item) => {
    const lane = item.lane || 0;
    if (!map.has(lane)) map.set(lane, []);
    map.get(lane).push(item);
  });

  return map;
}

export function getLaneOffsetX(lane) {
  return lane * (LANE_WIDTH + GAP);
}

export function getDotRadius(item) {
  const recency = clamp01(item?.recency?.weight ?? 0);
  const duration = clamp01(item?.duration?.weight ?? 0);
  const relevance = clamp01(item?.signals?.dynamics?.recent_relevance ?? 0);

  const weight = recency * 0.35 + duration * 0.4 + relevance * 0.25;
  return 4 + weight * 6;
}

export function collectFunctionalDomains(items) {
  const map = new Map();

  items.forEach((item, itemIndex) => {
    const xpId = item.id;
    const lane = item.lane || 0;

    (item?.domains?.functional || []).forEach((domain) => {
      const id = `fd-${domain.code}`;

      const existing = map.get(id) || {
        id,
        code: domain.code,
        label: domain.label,
        score: domain.score || 0,
        xpIds: [],
        lanes: new Set(),
        firstXpIndex: itemIndex,
        firstXpId: xpId,
      };

      existing.score = Math.max(existing.score, domain.score || 0);

      if (!existing.xpIds.includes(xpId)) {
        existing.xpIds.push(xpId);
      }

      existing.lanes.add(lane);

      if (itemIndex < existing.firstXpIndex) {
        existing.firstXpIndex = itemIndex;
        existing.firstXpId = xpId;
      }

      map.set(id, existing);
    });
  });

  return Array.from(map.values())
    .map((domain) => ({
      ...domain,
      lanes: Array.from(domain.lanes).sort((a, b) => a - b),
    }))
    .sort(
      (a, b) =>
        a.firstXpIndex - b.firstXpIndex ||
        b.score - a.score ||
        a.label.localeCompare(b.label, "fr"),
    );
}

export function buildLinkPath(x1, y1, x2, y2) {
  const dx = Math.max(60, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

export function getDomainPillY(index) {
  return DOMAIN_TOP + index * DOMAIN_GAP;
}

function resolveCascadeWithPinned({
  pinnedDomains,
  flowingDomains,
  minGap = 56,
  minY = 80,
  maxY = 1200,
  passes = 4,
}) {
  const pinned = (pinnedDomains || [])
    .map((d) => ({ ...d }))
    .sort((a, b) => a.y - b.y);

  const flowing = (flowingDomains || [])
    .map((d) => ({ ...d }))
    .sort((a, b) => a.y - b.y);

  if (!flowing.length) return flowing;

  for (let pass = 0; pass < passes; pass += 1) {
    // 1) collisions flowing <-> pinned
    for (let i = 0; i < flowing.length; i += 1) {
      const current = flowing[i];

      for (let j = 0; j < pinned.length; j += 1) {
        const obstacle = pinned[j];
        const delta = current.y - obstacle.y;
        const distance = Math.abs(delta);

        if (distance < minGap) {
          const push = minGap - distance;
          current.y += delta <= 0 ? -push : push;
        }
      }

      current.y = Math.max(minY, Math.min(current.y, maxY));
    }

    // 2) cascade forward between flowing
    for (let i = 1; i < flowing.length; i += 1) {
      const prev = flowing[i - 1];
      const curr = flowing[i];
      const gap = curr.y - prev.y;

      if (gap < minGap) {
        curr.y = prev.y + minGap;
      }
    }

    // 3) cascade backward between flowing
    for (let i = flowing.length - 2; i >= 0; i -= 1) {
      const next = flowing[i + 1];
      const curr = flowing[i];
      const gap = next.y - curr.y;

      if (gap < minGap) {
        curr.y = next.y - minGap;
      }
    }

    // 4) clamp
    for (let i = 0; i < flowing.length; i += 1) {
      flowing[i].y = Math.max(minY, Math.min(flowing[i].y, maxY));
    }
  }

  return flowing;
}

export function resolveVerticalCollisions(
  items,
  { minGap = 56, minY = 80, maxY = 1200, passes = 3 } = {},
) {
  if (!Array.isArray(items) || items.length <= 1) return items || [];

  const sorted = [...items]
    .map((item) => ({ ...item }))
    .sort((a, b) => a.y - b.y);

  for (let pass = 0; pass < passes; pass += 1) {
    // Forward pass
    for (let i = 1; i < sorted.length; i += 1) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = curr.y - prev.y;

      if (gap < minGap) {
        curr.y = prev.y + minGap;
      }
    }

    // Backward pass
    for (let i = sorted.length - 2; i >= 0; i -= 1) {
      const next = sorted[i + 1];
      const curr = sorted[i];
      const gap = next.y - curr.y;

      if (gap < minGap) {
        curr.y = next.y - minGap;
      }
    }

    // Clamp
    for (let i = 0; i < sorted.length; i += 1) {
      sorted[i].y = Math.max(minY, Math.min(sorted[i].y, maxY));
    }
  }

  return sorted;
}

export function repelOtherDomainsFromAligned({
  alignedDomains,
  otherDomains,
  minGap = 80,
  minY = 80,
  maxY = 1200,
  passes = 3,
} = {}) {
  const result = (otherDomains || []).map((domain) => ({ ...domain }));

  if (!alignedDomains?.length || !result.length) return result;

  for (let pass = 0; pass < passes; pass += 1) {
    for (let i = 0; i < result.length; i += 1) {
      const current = result[i];

      for (let j = 0; j < alignedDomains.length; j += 1) {
        const anchor = alignedDomains[j];
        const diff = current.y - anchor.y;
        const distance = Math.abs(diff);

        if (distance < minGap) {
          const push = minGap - distance;

          if (diff <= 0) {
            current.y -= push;
          } else {
            current.y += push;
          }
        }
      }

      current.y = Math.max(minY, Math.min(current.y, maxY));
    }
  }

  return result;
}

export function computeAlignedDomainPositions({
  baseDomains,
  selectedXp,
  selectedAnchor,
  totalHeight,
  topPadding = 80,
  bottomPadding = 80,
  spacing = 48,
} = {}) {
  if (!selectedXp || !selectedAnchor) return baseDomains || [];

  const selectedFunctional = selectedXp?.domains?.functional || [];
  if (!selectedFunctional.length) return baseDomains || [];

  const selectedScoreMap = new Map(
    selectedFunctional.map((domain) => [
      `fd-${domain.code}`,
      domain.score || 0,
    ]),
  );

  const aligned = (baseDomains || [])
    .filter((domain) => selectedScoreMap.has(domain.id))
    .map((domain) => ({
      ...domain,
      selectedScore: selectedScoreMap.get(domain.id) || 0,
    }));

  const others = (baseDomains || [])
    .filter((domain) => !selectedScoreMap.has(domain.id))
    .map((domain) => ({ ...domain }));

  if (!aligned.length) return baseDomains || [];

  // ordre local du cluster actif = poids décroissant
  aligned.sort((a, b) => {
    if (b.selectedScore !== a.selectedScore) {
      return b.selectedScore - a.selectedScore;
    }
    return a.firstXpIndex - b.firstXpIndex;
  });

  const count = aligned.length;
  const maxY = Math.max(topPadding, totalHeight - bottomPadding);
  const startY = selectedAnchor.y - ((count - 1) * spacing) / 2;

  // 1. les actives se regroupent autour de l'XP
  aligned.forEach((domain, index) => {
    domain.y = Math.max(topPadding, Math.min(startY + index * spacing, maxY));
  });

  // 2. collision interne des actives
  const resolvedAligned = resolveVerticalCollisions(aligned, {
    minGap: spacing,
    minY: topPadding,
    maxY,
    passes: 4,
  });

  // 3. les inactives restent à leur place, mais sont repoussées en cascade si collision
  const resolvedOthers = resolveCascadeWithPinned({
    pinnedDomains: resolvedAligned,
    flowingDomains: others,
    minGap: spacing,
    minY: topPadding,
    maxY,
    passes: 4,
  });

  // 4. on restitue l'ordre global de base pour garder la mémoire visuelle
  const resolvedMap = new Map(
    [...resolvedAligned, ...resolvedOthers].map((domain) => [
      domain.id,
      domain,
    ]),
  );

  return baseDomains.map((domain) => resolvedMap.get(domain.id) || domain);
}
