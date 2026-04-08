import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, X } from "lucide-react";

const SPEC = {
  topPadding: 32,
  bottomPadding: 40,
  timelineX: 32,
  yearWidth: 320,
  cardX: 69,
  cardWidth: 320,
  dateHeight: 24,
  cardHeight: 108,
  baseGap: 4,
  gapPerMissingYear: 0,
  maxExtraGap: 28,
};

const LANE_WIDTH = 360;
const GAP = 80;
const DOMAIN_WIDTH = 220;
const DOMAIN_X_OFFSET = 180;
const DOMAIN_TOP = 120;
const DOMAIN_GAP = 86;

function clamp01(value) {
  const v = Number(value);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function toPercent(value) {
  return Math.round(clamp01(value));
}

function sortXp(data) {
  return Object.entries(data || {})
    .map(([id, item]) => ({ id: String(id), ...item }))
    .sort((a, b) => {
      const ay =
        extractYear(a?.identity?.date_start) ?? a?.recency?.asof_year ?? 0;
      const by =
        extractYear(b?.identity?.date_start) ?? b?.recency?.asof_year ?? 0;
      if (ay !== by) return ay - by;
      return Number(a.id) - Number(b.id);
    });
}

function extractYear(value) {
  if (!value || typeof value !== "string") return null;
  const match = value.match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function getStartYear(item) {
  return (
    extractYear(item?.identity?.date_start) ?? item?.recency?.asof_year ?? null
  );
}

function getEndYear(item) {
  if (item?.identity?.is_current) return null;
  return (
    extractYear(item?.identity?.date_end) ?? item?.recency?.asof_year ?? null
  );
}

function normalizeTimelineItems(items) {
  return items.map((item) => ({
    ...item,
    startYear: getStartYear(item),
    endYear: getEndYear(item),
  }));
}

function assignLanes(items) {
  const lanes = [];

  items.forEach((item) => {
    const start = item.startYear ?? 0;
    const end = item.endYear ?? 9999;
    let placed = false;

    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex += 1) {
      const lane = lanes[laneIndex];

      const overlap = lane.some((other) => {
        const oStart = other.startYear ?? 0;
        const oEnd = other.endYear ?? 9999;
        return !(end <= oStart || start >= oEnd);
      });

      if (!overlap) {
        lane.push(item);
        item.lane = laneIndex;
        placed = true;
        break;
      }
    }

    if (!placed) {
      item.lane = lanes.length;
      lanes.push([item]);
    }
  });

  return items;
}

function buildTimelineStepsByLane(items) {
  const byLane = new Map();

  items.forEach((item) => {
    const lane = item.lane || 0;
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push(item);
  });

  const laneSteps = new Map();

  Array.from(byLane.entries()).forEach(([lane, laneItems]) => {
    const steps = [];

    for (let i = 0; i < laneItems.length; i += 1) {
      const current = laneItems[i];
      const next = laneItems[i + 1] || null;
      const startYear = current.startYear;
      const endYear = current.endYear;

      if (startYear != null) {
        steps.push({
          type: "date",
          value: String(startYear),
          xpId: current.id,
          role: "start",
          lane,
        });
      }

      steps.push({ type: "xp", xp: current, lane });

      if (endYear != null) {
        steps.push({
          type: "date",
          value: String(endYear),
          xpId: current.id,
          role: "end",
          lane,
        });
      }

      if (next && endYear != null) {
        const nextStartYear = next.startYear;
        if (nextStartYear != null && nextStartYear !== endYear) {
          steps.push({
            type: "date",
            value: String(nextStartYear),
            xpId: next.id,
            role: "start-bridge",
            lane,
          });
        }
      }
    }

    if (lane === 0) {
      steps.push({
        type: "date",
        value: "Aujourd'hui",
        xpId: null,
        role: "today",
        lane,
      });
    }

    laneSteps.set(lane, mergeAdjacentDates(steps));
  });

  return laneSteps;
}

function mergeAdjacentDates(steps) {
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
        value: `${current.value} → ${next.value}`,
        lane: current.lane,
      });
      i += 1;
      continue;
    }

    const prev = out[out.length - 1];
    if (
      current.type === "date" &&
      prev?.type === "date" &&
      typeof prev.value === "string" &&
      prev.value.includes(current.value)
    ) {
      continue;
    }

    out.push(current);
  }

  return out;
}

function findPrevXp(steps, index) {
  for (let i = index - 1; i >= 0; i -= 1) {
    if (steps[i].type === "xp") return steps[i];
  }
  return null;
}

function getLaneStartOffsetY(firstLaneYear, firstGlobalYear) {
  const deltaYears = Math.max(
    0,
    (firstLaneYear ?? firstGlobalYear) - firstGlobalYear,
  );
  return Math.min(deltaYears * 28, 72);
}

function computeTimelineLayoutByLane(laneSteps, laneItemsMap, spec = SPEC) {
  const allSteps = [];
  const laneHeights = [];
  const allLaneItems = Array.from(laneItemsMap.values()).flat();
  const years = allLaneItems
    .map((item) => item.startYear)
    .filter((v) => v != null);
  const firstGlobalYear = years.length ? Math.min(...years) : 0;

  Array.from(laneSteps.entries()).forEach(([lane, steps]) => {
    const laneItems = laneItemsMap.get(lane) || [];
    const laneYears = laneItems
      .map((item) => item.startYear)
      .filter((v) => v != null);
    const firstLaneYear = laneYears.length
      ? Math.min(...laneYears)
      : firstGlobalYear;

    let y =
      spec.topPadding + getLaneStartOffsetY(firstLaneYear, firstGlobalYear);
    const laidOut = [];

    for (let i = 0; i < steps.length; i += 1) {
      const step = steps[i];

      if (step.type === "date") {
        laidOut.push({ ...step, y, height: spec.dateHeight });
        y += spec.dateHeight;
        if (i < steps.length - 1) y += spec.baseGap;
        continue;
      }

      const prevXp = findPrevXp(steps, i);
      const currentStart = getStartYear(step.xp);
      const prevEnd = prevXp ? getEndYear(prevXp.xp) : null;
      let extraGap = 0;

      if (prevXp && currentStart != null && prevEnd != null) {
        const missingYears = Math.max(0, currentStart - prevEnd);
        extraGap = Math.min(
          missingYears * spec.gapPerMissingYear,
          spec.maxExtraGap,
        );
      }

      y += extraGap;
      laidOut.push({
        ...step,
        y,
        height: spec.cardHeight,
        anchorY: y + spec.cardHeight / 2,
      });
      y += spec.cardHeight;
      if (i < steps.length - 1) y += spec.baseGap;
    }

    laneHeights[lane] = y + spec.bottomPadding;
    allSteps.push(...laidOut);
  });

  return {
    steps: allSteps,
    totalHeight: Math.max(...laneHeights, spec.topPadding + spec.bottomPadding),
    laneCount: laneHeights.length,
  };
}

function groupItemsByLane(items) {
  const map = new Map();
  items.forEach((item) => {
    const lane = item.lane || 0;
    if (!map.has(lane)) map.set(lane, []);
    map.get(lane).push(item);
  });
  return map;
}

function getLaneOffsetX(lane) {
  return lane * (LANE_WIDTH + GAP);
}

function getDotRadius(item) {
  const recency = clamp01(item?.recency?.weight ?? 0);
  const duration = clamp01(item?.duration?.weight ?? 0);
  const relevance = clamp01(item?.signals?.dynamics?.recent_relevance ?? 0);
  const weight = recency * 0.4 + duration * 0.35 + relevance * 0.25;
  return 4 + weight * 6;
}

function getCompanyLabel(item) {
  return (
    item?.identity?.company_name ||
    item?.company?.name ||
    "Organisation non précisée"
  );
}

function getLocationLabel(item) {
  if (item?.identity?.location_raw) return item.identity.location_raw;
  const city = item?.geo?.city_name;
  const dept = item?.geo?.dept_code;
  if (city && dept) return `${city} (${dept})`;
  return city || "Localisation inconnue";
}

function getDateRangeLabel(item) {
  const start = item?.identity?.date_start;
  const end = item?.identity?.date_end;
  if (start && end) return `${start} → ${end}`;
  if (start && item?.identity?.is_current) return `${start} → Aujourd'hui`;
  return start || "Dates non précisées";
}

function getSignalItems(item) {
  const posture = item?.signals?.posture || {};
  const level = item?.signals?.level || {};
  const dynamics = item?.signals?.dynamics || {};

  return [
    {
      key: "leadership",
      label: "Leadership",
      value: Math.round(clamp01(posture.leadership || 0) * 100),
      group: "posture",
    },
    {
      key: "individual_contributor",
      label: "Contrib. indiv.",
      value: Math.round(clamp01(posture.individual_contributor || 0) * 100),
      group: "posture",
    },
    {
      key: "managerial_scope",
      label: "Managerial",
      value: Math.round(clamp01(posture.managerial_scope || 0) * 100),
      group: "posture",
    },
    {
      key: "cross_functional_scope",
      label: "Cross-fonctionnel",
      value: Math.round(clamp01(posture.cross_functional_scope || 0) * 100),
      group: "posture",
    },
    {
      key: "strategic_scope",
      label: "Stratégique",
      value: Math.round(clamp01(level.strategic_scope || 0) * 100),
      group: "level",
    },
    {
      key: "execution_scope",
      label: "Exécution",
      value: Math.round(clamp01(level.execution_scope || 0) * 100),
      group: "level",
    },
    {
      key: "recent_relevance",
      label: "Récence",
      value: Math.round(clamp01(dynamics.recent_relevance || 0) * 100),
      group: "dynamics",
    },
  ];
}

const flagLabelMap = {
  team_management: "Management",
  budget_ownership: "Budget P&L",
  cross_functional_collaboration: "Cross-fonctionnel",
  strategy_signal: "Stratégie",
  execution_signal: "Exécution",
  ownership_signal: "Ownership",
  metrics_present: "Métriques",
  transformation_signal: "Transformation",
  client_or_stakeholder_scope: "Stakeholders",
  scale_scope: "Scale",
};

function getEvidenceFlags(item) {
  return Object.entries(item?.evidence_flags || {}).map(([key, value]) => ({
    key,
    label: flagLabelMap[key] || key,
    isActive: Boolean(value),
  }));
}

function formatNumber(value) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("fr-FR").format(value);
}

function getCompanyResolutionSummary(item) {
  const company = item?.company || {};
  if (company.status !== "resolved") return null;
  return {
    name:
      company.name || item?.identity?.company_name || "Organisation résolue",
    siren: company.siren || null,
    naf: company.naf || null,
    section: company?.industry?.section?.label || null,
    division: company?.industry?.division?.label || null,
    sizeSegment:
      company?.org?.size_context?.segment ||
      company?.org?.size_declared?.segment ||
      company?.tranche_effectif?.segment ||
      null,
    scope: company?.org?.scope || null,
    hqCity: company?.hq?.city || null,
    matchedCity: company?.matched_establishment?.city || null,
    financeYear: company?.finance?.year || null,
    revenue: company?.finance?.ca ?? null,
    netIncome: company?.finance?.resultat_net ?? null,
  };
}

function getExcerptLines(item) {
  const excerpt = item?.source?.excerpt;
  if (!excerpt || typeof excerpt !== "string") return [];
  return excerpt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function collectFunctionalDomains(items) {
  const map = new Map();

  items.forEach((item) => {
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
      };

      existing.score = Math.max(existing.score, domain.score || 0);
      if (!existing.xpIds.includes(xpId)) existing.xpIds.push(xpId);
      existing.lanes.add(lane);
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
        b.score - a.score ||
        b.xpIds.length - a.xpIds.length ||
        a.label.localeCompare(b.label, "fr"),
    );
}

function buildLinkPath(x1, y1, x2, y2) {
  const dx = Math.max(60, (x2 - x1) * 0.5);
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

function getDomainPillY(index) {
  return DOMAIN_TOP + index * DOMAIN_GAP;
}

function TimelineDate({ value, y, lane = 0 }) {
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

function TimelineCard({
  item,
  y,
  lane = 0,
  isActive = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) {
  const offsetX = getLaneOffsetX(lane);

  return (
    <button
      type="button"
      className={`absolute rounded-[20px] border px-4 py-3 shadow-sm transition-all duration-200 text-left ${isActive ? "border-violet-300 bg-violet-50/40 shadow-md" : "border-zinc-300 bg-white"}`}
      style={{
        left: SPEC.cardX + offsetX,
        top: y,
        width: SPEC.cardWidth,
        height: SPEC.cardHeight,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <div className="line-clamp-1 text-[14px] font-bold leading-5 text-zinc-900">
        {item?.identity?.job_title || "Poste non précisé"}
      </div>
      <div className="mt-0.5 line-clamp-1 text-[12px] text-zinc-700">
        {getCompanyLabel(item)}
      </div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <CalendarDays size={11} />
        <span className="line-clamp-1">{getDateRangeLabel(item)}</span>
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <MapPin size={11} />
        <span className="line-clamp-1">{getLocationLabel(item)}</span>
      </div>
    </button>
  );
}

function DomainPill({
  domain,
  x,
  y,
  isActive = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) {
  return (
    <button
      type="button"
      className={`absolute rounded-full border px-4 py-2 text-[12px] font-medium transition-all duration-200 ${isActive ? "border-violet-300 bg-violet-50 text-violet-700 shadow-md" : "border-zinc-300 bg-white text-zinc-700"}`}
      style={{ left: x, top: y, width: DOMAIN_WIDTH, textAlign: "center" }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {domain.label}
    </button>
  );
}

function TimelineAxis({
  totalHeight,
  xpAnchors,
  laneCount,
  linkPaths = [],
  canvasWidth,
}) {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox={`0 0 ${canvasWidth} ${totalHeight}`}
      preserveAspectRatio="none"
    >
      {Array.from({ length: laneCount }).map((_, lane) => {
        const x = SPEC.timelineX + getLaneOffsetX(lane);

        return (
          <line
            key={`lane-line-${lane}`}
            x1={x}
            x2={x}
            y1={SPEC.topPadding}
            y2={totalHeight - SPEC.bottomPadding}
            stroke="#d4d4d8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      {linkPaths.map((link) => (
        <path
          key={link.id}
          d={link.d}
          fill="none"
          stroke={link.active ? "#8b5cf6" : "#d4d4d8"}
          strokeWidth={link.active ? 2.2 : 1.2}
          strokeDasharray={link.active ? "0" : "5 6"}
          opacity={link.active ? 0.95 : 0.35}
          className="transition-all duration-200"
        />
      ))}

      {xpAnchors.map((anchor) => (
        <circle
          key={anchor.id}
          cx={SPEC.timelineX + getLaneOffsetX(anchor.lane || 0)}
          cy={anchor.y}
          r={anchor.r}
          fill={anchor.active ? "#7c3aed" : "#18181b"}
          className="transition-all duration-200"
        />
      ))}
    </svg>
  );
}

function MetricLine({ label, value, group = "posture" }) {
  const groupMeta = {
    posture: { bar: "bg-emerald-500" },
    level: { bar: "bg-indigo-500" },
    dynamics: { bar: "bg-amber-600" },
  };
  const meta = groupMeta[group] || groupMeta.posture;
  const isZero = value === 0;

  return (
    <div
      className={`grid grid-cols-[96px_1fr_42px] items-center gap-3 text-[11px] ${isZero ? "opacity-45" : "opacity-100"}`}
    >
      <div className="text-zinc-700">{label}</div>
      <div className="h-1.5 rounded-full bg-zinc-200">
        <div
          className={`h-1.5 rounded-full ${meta.bar}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="text-right font-semibold text-zinc-600">{value}%</div>
    </div>
  );
}

function EvidenceFlag({ label, isActive }) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] ${isActive ? "text-zinc-700" : "text-zinc-400"}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-zinc-300"}`}
      />
      <span>{label}</span>
    </div>
  );
}

function InfoBox({ label, value }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50/80 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-zinc-800">
        {value || "—"}
      </div>
    </div>
  );
}

function DetailDrawer({ isOpen, item, onClose }) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const functionalDomains = (item?.domains?.functional || [])
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const contextDomains = (item?.domains?.context || [])
    .slice()
    .sort((a, b) => (b.score || 0) - (a.score || 0));
  const signalItems = getSignalItems(item || {});
  const evidence = getEvidenceFlags(item || {});
  const company = getCompanyResolutionSummary(item || {});
  const excerptLines = getExcerptLines(item || {});

  return (
    <>
      <div
        className={`absolute inset-0 z-30 bg-zinc-950/20 backdrop-blur-[1px] transition-opacity duration-200 ${isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute right-0 top-0 z-40 h-full w-[380px] max-w-[92vw] border-l border-zinc-200 bg-white shadow-2xl transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <div className="text-[15px] font-bold leading-5 text-zinc-900">
              {item?.identity?.job_title || "Détails"}
            </div>
            <div className="mt-1 text-[12px] text-zinc-600">
              {item
                ? `${getCompanyLabel(item)} · ${getDateRangeLabel(item)}`
                : "Clique sur une expérience"}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-50"
            type="button"
            aria-label="Fermer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="h-[calc(100%-73px)] overflow-y-auto px-5 py-5">
          {item ? (
            <div className="space-y-5">
              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Domaines
                </div>
                <div className="flex flex-wrap gap-2">
                  {functionalDomains.map((domain, index) => (
                    <span
                      key={domain.code}
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${index === 0 ? "border-violet-300 bg-violet-50 text-violet-700" : "border-zinc-200 bg-zinc-50 text-zinc-700"}`}
                    >
                      {domain.label}{" "}
                      {Math.round(clamp01(domain.score || 0) * 100)}%
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Contexte
                </div>
                <div className="flex flex-wrap gap-2">
                  {contextDomains.length ? (
                    contextDomains.map((domain) => (
                      <span
                        key={domain.code}
                        className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600"
                      >
                        {domain.label}
                      </span>
                    ))
                  ) : (
                    <span className="text-[12px] text-zinc-400">
                      Aucun contexte détecté
                    </span>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Signals
                </div>
                <div className="space-y-2.5">
                  {signalItems.map((signal) => (
                    <MetricLine
                      key={signal.key}
                      label={signal.label}
                      value={signal.value}
                      group={signal.group}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Evidence flags
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {evidence.map((flag) => (
                    <EvidenceFlag
                      key={flag.key}
                      label={flag.label}
                      isActive={flag.isActive}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Excerpt
                </div>
                <div className="space-y-2 text-[12px] leading-5 text-zinc-600">
                  {excerptLines.length ? (
                    excerptLines.map((line, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2"
                      >
                        {line}
                      </div>
                    ))
                  ) : (
                    <div className="text-zinc-400">
                      Aucun excerpt disponible.
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Company resolution
                </div>
                {company ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <div className="font-bold text-zinc-900">
                        {company.name}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        SIREN {company.siren || "—"}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoBox label="Secteur" value={company.section} />
                      <InfoBox label="Division" value={company.division} />
                      <InfoBox label="NAF" value={company.naf} />
                      <InfoBox
                        label="Taille / segment"
                        value={company.sizeSegment}
                      />
                      <InfoBox label="Scope org" value={company.scope} />
                      <InfoBox label="HQ" value={company.hqCity} />
                      <InfoBox
                        label="Établissement matché"
                        value={company.matchedCity}
                      />
                      <InfoBox
                        label="Année finance"
                        value={company.financeYear}
                      />
                      <InfoBox
                        label="CA"
                        value={
                          company.revenue != null
                            ? `${formatNumber(company.revenue)} €`
                            : "—"
                        }
                      />
                      <InfoBox
                        label="Résultat net"
                        value={
                          company.netIncome != null
                            ? `${formatNumber(company.netIncome)} €`
                            : "—"
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                    Pas de résolution société exploitable sur cette expérience.
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}

import useCareerGraphModel from "@/hooks/useCareerGraphModel";

export default function CareerGraphFlow({ data = {} }) {
  const {
    timeline,
    canvasWidth,
    xpAnchors,
    linkPaths,
    alignedDomainPositions,
    selectedItem,
    activeXpId,
    activeDomainIds,
    hoveredDomainId,
    setHoveredXpId,
    setHoveredDomainId,
    setSelectedXpId,
    handleCloseDrawer,
  } = useCareerGraphModel(data);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-[1600px] rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            Timeline basic — parallel lanes
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            Enchaînement Année / XP + lane parallèle + FD
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Prototype minimal avec lane principale, lane parallèle, dots
            pondérés et domaines fonctionnels reliés au hover et au click.
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-[24px] border border-zinc-200 bg-zinc-50/60"
          style={{ height: timeline.totalHeight }}
        >
          <div
            style={{
              position: "relative",
              width: canvasWidth,
              height: timeline.totalHeight,
            }}
          >
            <TimelineAxis
              totalHeight={timeline.totalHeight}
              xpAnchors={xpAnchors}
              laneCount={timeline.laneCount}
              linkPaths={linkPaths}
              canvasWidth={canvasWidth}
            />

            {timeline.steps.map((step, index) => {
              if (step.type === "date") {
                return (
                  <TimelineDate
                    key={`${step.lane}-${step.value}-${index}`}
                    value={step.value}
                    y={step.y}
                    lane={step.lane || 0}
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

            {alignedDomainPositions.map((domain) => (
              <DomainPill
                key={domain.id}
                domain={domain}
                x={domain.x}
                y={domain.y}
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
            ))}

            <DetailDrawer
              isOpen={Boolean(selectedItem)}
              item={selectedItem}
              onClose={handleCloseDrawer}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
