import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  MapPin,
  CalendarDays,
  Building2,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Layers3,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";

function clamp01(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toPercent(value) {
  return Math.round(clamp01(value) * 100);
}

function sortXpEntries(data) {
  return Object.entries(data || {}).sort((a, b) => {
    const aYear = a?.[1]?.recency?.asof_year ?? 0;
    const bYear = b?.[1]?.recency?.asof_year ?? 0;

    if (bYear !== aYear) return bYear - aYear;

    const aCurrent = a?.[1]?.identity?.is_current ? 1 : 0;
    const bCurrent = b?.[1]?.identity?.is_current ? 1 : 0;

    if (bCurrent !== aCurrent) return bCurrent - aCurrent;

    return Number(b[0]) - Number(a[0]);
  });
}

function getDateLabel(item) {
  const start = item?.identity?.date_start;
  const end = item?.identity?.date_end;
  const isCurrent = item?.identity?.is_current;

  if (start && isCurrent) return `Depuis ${start}`;
  if (start && end) return `${start} → ${end}`;
  if (start) return start;
  return "Dates non précisées";
}

function getLocationLabel(item) {
  const raw = item?.identity?.location_raw;
  if (raw) return raw;

  const city = item?.geo?.city_name;
  const dept = item?.geo?.dept_code;
  if (city && dept) return `${city} (${dept})`;
  if (city) return city;

  return "Localisation inconnue";
}

function getCompanyLabel(item) {
  return (
    item?.identity?.company_name ||
    item?.company?.name ||
    "Organisation non précisée"
  );
}

function getTopFunctionalDomains(item, limit = 3) {
  return (item?.domains?.functional || []).slice(0, limit);
}

function getTopContextDomains(item, limit = 2) {
  return (item?.domains?.context || []).slice(0, limit);
}

function extractHighlights(excerpt) {
  if (!excerpt) return [];
  return excerpt
    .split("\n")
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^-+\s*/, ""))
    .slice(0, 3);
}

function getEvidenceBadges(flags = {}) {
  const mapping = [
    { key: "team_management", label: "Team management" },
    { key: "budget_ownership", label: "Budget" },
    { key: "cross_functional_collaboration", label: "Cross-fonctionnel" },
    { key: "strategy_signal", label: "Stratégie" },
    { key: "execution_signal", label: "Exécution" },
    { key: "ownership_signal", label: "Ownership" },
    { key: "metrics_present", label: "Metrics" },
    { key: "transformation_signal", label: "Transformation" },
    { key: "client_or_stakeholder_scope", label: "Stakeholders" },
    { key: "scale_scope", label: "Scale" },
  ];

  return mapping.filter((item) => Boolean(flags[item.key]));
}

function scoreLabel(value) {
  const pct = toPercent(value);
  if (pct >= 85) return "Très fort";
  if (pct >= 65) return "Fort";
  if (pct >= 40) return "Modéré";
  if (pct > 0) return "Présent";
  return "Faible";
}

function getDominantPosture(items) {
  const totals = {
    leadership: 0,
    individual_contributor: 0,
    managerial_scope: 0,
    cross_functional_scope: 0,
  };

  items.forEach((item) => {
    const posture = item?.signals?.posture || {};
    Object.keys(totals).forEach((key) => {
      totals[key] += clamp01(posture[key] || 0);
    });
  });

  const labels = {
    leadership: "Leadership",
    individual_contributor: "Builder / IC",
    managerial_scope: "Scope managérial",
    cross_functional_scope: "Scope transverse",
  };

  const winner = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return winner ? labels[winner[0]] : "Non déterminé";
}

function getDominantDomain(items) {
  const scores = {};

  items.forEach((item) => {
    (item?.domains?.functional || []).forEach((domain) => {
      if (!domain?.label) return;
      scores[domain.label] = (scores[domain.label] || 0) + (domain.score || 0);
    });
  });

  const winner = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return winner?.[0] || "Non déterminé";
}

function getCareerNarrative(items) {
  const current = items[0];
  const oldest = items[items.length - 1];

  const currentTitle = current?.identity?.job_title || "poste actuel";
  const oldestTitle = oldest?.identity?.job_title || "poste initial";

  return `${oldestTitle} → ${currentTitle}`;
}

function getSenioritySignal(items) {
  const avgStrategic =
    items.reduce(
      (sum, item) => sum + clamp01(item?.signals?.level?.strategic_scope || 0),
      0,
    ) / Math.max(items.length, 1);

  const avgLeadership =
    items.reduce(
      (sum, item) => sum + clamp01(item?.signals?.posture?.leadership || 0),
      0,
    ) / Math.max(items.length, 1);

  if (avgStrategic >= 0.7 && avgLeadership >= 0.65) {
    return "Trajectoire senior / executive";
  }
  if (avgStrategic >= 0.45 || avgLeadership >= 0.45) {
    return "Trajectoire lead / management";
  }
  return "Trajectoire contributive experte";
}

function getCurrentMomentum(items) {
  const recentItems = items.slice(0, 3);

  const avgRecent =
    recentItems.reduce(
      (sum, item) =>
        sum + clamp01(item?.signals?.dynamics?.recent_relevance || 0),
      0,
    ) / Math.max(recentItems.length, 1);

  if (avgRecent >= 0.75) return "Momentum récent fort";
  if (avgRecent >= 0.45) return "Momentum récent visible";
  return "Momentum récent plus faible";
}

function ProgressStat({ label, value, tone = "primary" }) {
  const percent = toPercent(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-base-content/80">
          {label}
        </span>
        <span className="text-xs font-semibold text-base-content/60">
          {percent}%
        </span>
      </div>
      <progress
        className={`progress progress-${tone} h-2 w-full`}
        value={percent}
        max="100"
      />
    </div>
  );
}

function BadgeScore({ label, value, color = "badge-primary" }) {
  return (
    <div className={`badge ${color} badge-outline gap-1 px-3 py-3`}>
      <span>{label}</span>
      <span className="font-semibold">{scoreLabel(value)}</span>
    </div>
  );
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="rounded-xl bg-base-200 p-2">
        <Icon size={16} />
      </div>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-base-content/60">
        {children}
      </h3>
    </div>
  );
}

function TimelineCard({ item, index, isLast }) {
  const title = item?.identity?.job_title || "Poste non précisé";
  const company = getCompanyLabel(item);
  const location = getLocationLabel(item);
  const dateLabel = getDateLabel(item);
  const durationYears = item?.duration?.years_estimate;
  const isCurrent = Boolean(item?.identity?.is_current);

  const posture = item?.signals?.posture || {};
  const level = item?.signals?.level || {};
  const dynamics = item?.signals?.dynamics || {};

  const domains = getTopFunctionalDomains(item);
  const contextDomains = getTopContextDomains(item);
  const evidenceBadges = getEvidenceBadges(item?.evidence_flags);
  const highlights = extractHighlights(item?.source?.excerpt);

  const companyStatus = item?.company?.status || "unknown";

  return (
    <div className="relative pl-10">
      <div className="absolute left-0 top-1 flex h-full flex-col items-center">
        <div className="z-10 flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-base-100 shadow-sm">
          <Briefcase size={18} className="text-primary" />
        </div>
        {!isLast && <div className="mt-2 h-full w-px bg-base-300" />}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: index * 0.06 }}
        className="card border border-base-300 bg-base-100 shadow-xl"
      >
        <div className="card-body gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold leading-tight">{title}</h2>
                {isCurrent && <div className="badge badge-primary">Actuel</div>}
                {companyStatus === "resolved" && (
                  <div className="badge badge-success badge-outline gap-1">
                    <CheckCircle2 size={12} />
                    Company matched
                  </div>
                )}
                {companyStatus !== "resolved" && (
                  <div className="badge badge-ghost gap-1">
                    <CircleDashed size={12} />
                    {companyStatus}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 text-sm text-base-content/70 md:flex-row md:flex-wrap md:items-center">
                <div className="flex items-center gap-2">
                  <Building2 size={15} />
                  <span>{company}</span>
                </div>

                <div className="hidden md:block text-base-content/30">•</div>

                <div className="flex items-center gap-2">
                  <MapPin size={15} />
                  <span>{location}</span>
                </div>

                <div className="hidden md:block text-base-content/30">•</div>

                <div className="flex items-center gap-2">
                  <CalendarDays size={15} />
                  <span>{dateLabel}</span>
                </div>

                {durationYears ? (
                  <>
                    <div className="hidden md:block text-base-content/30">
                      •
                    </div>
                    <span>{durationYears} ans estimés</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:max-w-[320px] lg:justify-end">
              {domains.map((domain) => (
                <div
                  key={domain.code}
                  className="badge badge-primary badge-outline"
                >
                  {domain.label}
                </div>
              ))}
              {contextDomains.map((domain) => (
                <div
                  key={domain.code}
                  className="badge badge-secondary badge-outline"
                >
                  {domain.label}
                </div>
              ))}
            </div>
          </div>

          {highlights.length > 0 && (
            <div className="rounded-2xl border border-base-300 bg-base-200/50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-base-content/50">
                Highlights
              </p>
              <div className="space-y-2">
                {highlights.map((line, idx) => (
                  <div
                    key={`${item?.identity?.job_title}-${idx}`}
                    className="text-sm leading-6 text-base-content/80"
                  >
                    • {line}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-2xl border border-base-300 p-4">
              <SectionTitle icon={TrendingUp}>Signals</SectionTitle>
              <div className="space-y-4">
                <ProgressStat
                  label="Leadership"
                  value={posture.leadership}
                  tone="primary"
                />
                <ProgressStat
                  label="Strategic scope"
                  value={level.strategic_scope}
                  tone="secondary"
                />
                <ProgressStat
                  label="Execution scope"
                  value={level.execution_scope}
                  tone="accent"
                />
                <ProgressStat
                  label="Recent relevance"
                  value={dynamics.recent_relevance}
                  tone="success"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-base-300 p-4">
              <SectionTitle icon={Layers3}>Profile readout</SectionTitle>
              <div className="flex flex-wrap gap-2">
                <BadgeScore
                  label="Leadership"
                  value={posture.leadership}
                  color="badge-primary"
                />
                <BadgeScore
                  label="Managerial"
                  value={posture.managerial_scope}
                  color="badge-secondary"
                />
                <BadgeScore
                  label="Cross-functional"
                  value={posture.cross_functional_scope}
                  color="badge-accent"
                />
                <BadgeScore
                  label="Builder"
                  value={posture.individual_contributor}
                  color="badge-info"
                />
              </div>
            </div>
          </div>

          {evidenceBadges.length > 0 && (
            <div>
              <SectionTitle icon={Target}>Evidence flags</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {evidenceBadges.map((item) => (
                  <div
                    key={item.key}
                    className="badge badge-ghost border-base-300 px-3 py-3"
                  >
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function InsightsPanel({ items }) {
  const dominantPosture = getDominantPosture(items);
  const dominantDomain = getDominantDomain(items);
  const narrative = getCareerNarrative(items);
  const seniority = getSenioritySignal(items);
  const momentum = getCurrentMomentum(items);

  const totalYears = items.reduce(
    (sum, item) => sum + (item?.duration?.years_estimate || 0),
    0,
  );

  const avgLeadership =
    items.reduce(
      (sum, item) => sum + clamp01(item?.signals?.posture?.leadership || 0),
      0,
    ) / Math.max(items.length, 1);

  const avgStrategic =
    items.reduce(
      (sum, item) => sum + clamp01(item?.signals?.level?.strategic_scope || 0),
      0,
    ) / Math.max(items.length, 1);

  const avgExecution =
    items.reduce(
      (sum, item) => sum + clamp01(item?.signals?.level?.execution_scope || 0),
      0,
    ) / Math.max(items.length, 1);

  return (
    <div className="sticky top-6 space-y-4">
      <div className="card overflow-hidden border border-primary/10 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 shadow-xl">
        <div className="card-body">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Career Insights</h2>
              <p className="text-sm text-base-content/60">
                Lecture instantanée du parcours
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-6 text-base-content/80">
            <div className="rounded-2xl bg-base-200/70 p-4">
              <span className="font-semibold text-base-content">
                Narrative :{" "}
              </span>
              {narrative}
            </div>
            <div className="rounded-2xl bg-base-200/70 p-4">
              <span className="font-semibold text-base-content">
                Dominante :{" "}
              </span>
              {dominantDomain}
            </div>
            <div className="rounded-2xl bg-base-200/70 p-4">
              <span className="font-semibold text-base-content">
                Posture :{" "}
              </span>
              {dominantPosture}
            </div>
            <div className="rounded-2xl bg-base-200/70 p-4">
              <span className="font-semibold text-base-content">
                Lecture niveau :{" "}
              </span>
              {seniority}
            </div>
            <div className="rounded-2xl bg-base-200/70 p-4">
              <span className="font-semibold text-base-content">
                Momentum :{" "}
              </span>
              {momentum}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <div className="card border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body">
            <SectionTitle icon={Users}>Overview</SectionTitle>
            <div className="stats stats-vertical bg-transparent shadow-none">
              <div className="stat px-0">
                <div className="stat-title">XP visualisées</div>
                <div className="stat-value text-primary">{items.length}</div>
              </div>
              <div className="stat px-0">
                <div className="stat-title">Années estimées</div>
                <div className="stat-value text-secondary">{totalYears}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card border border-base-300 bg-base-100 shadow-lg">
          <div className="card-body">
            <SectionTitle icon={TrendingUp}>Signal moyen</SectionTitle>
            <div className="space-y-4">
              <ProgressStat
                label="Leadership"
                value={avgLeadership}
                tone="primary"
              />
              <ProgressStat
                label="Strategic scope"
                value={avgStrategic}
                tone="secondary"
              />
              <ProgressStat
                label="Execution scope"
                value={avgExecution}
                tone="accent"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CareerGraph({ data = {} }) {
  const items = useMemo(() => {
    return sortXpEntries(data).map(([id, item]) => ({
      id,
      ...item,
    }));
  }, [data]);

  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 p-10 text-center shadow-sm">
        <h2 className="text-xl font-bold">Career Graph</h2>
        <p className="mt-2 text-base-content/60">
          Aucune expérience disponible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="hero overflow-hidden rounded-[2rem] border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-secondary/10 shadow-xl">
        <div className="hero-content w-full max-w-none px-6 py-10 md:px-10">
          <div className="w-full">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
                <Sparkles size={20} />
              </div>
              <div className="badge badge-secondary badge-outline px-4 py-3">
                Demo Career Graph
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
              <div>
                <h1 className="max-w-4xl text-4xl font-black tracking-tight md:text-5xl">
                  Parcours lisible en 10 secondes.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-base-content/70 md:text-lg">
                  Timeline enrichie à partir de{" "}
                  <span className="font-semibold">xp_enrichment_by_id</span> :
                  identité des expériences, signaux de posture, niveau, domaines
                  fonctionnels et lecture synthétique du parcours.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                    Experiences
                  </p>
                  <p className="mt-2 text-3xl font-black">{items.length}</p>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                    Current role
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6">
                    {items[0]?.identity?.job_title || "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-base-300 bg-base-100/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-base-content/50">
                    Dominant domain
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6">
                    {getDominantDomain(items)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <InsightsPanel items={items} />

        <div className="space-y-6">
          {items.map((item, index) => (
            <TimelineCard
              key={item.id}
              item={item}
              index={index}
              isLast={index === items.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
