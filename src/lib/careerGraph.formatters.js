import { clamp01 } from "./careerGraph.layout";

export function getCompanyLabel(item) {
  return (
    item?.identity?.company_name ||
    item?.company?.name ||
    "Organisation non précisée"
  );
}

export function getLocationLabel(item) {
  if (item?.identity?.location_raw) return item.identity.location_raw;

  const city = item?.geo?.city_name;
  const dept = item?.geo?.dept_code;

  if (city && dept) return `${city} (${dept})`;
  return city || "Localisation inconnue";
}

export function getDateRangeLabel(item) {
  const start = item?.identity?.date_start;
  const end = item?.identity?.date_end;

  if (start && end) return `${start} → ${end}`;
  if (start && item?.identity?.is_current) return `${start} → Aujourd'hui`;
  return start || "Dates non précisées";
}

export function getSignalItems(item) {
  const posture = item?.signals?.posture || {};
  const level = item?.signals?.level || {};

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

export function getEvidenceFlags(item) {
  return Object.entries(item?.evidence_flags || {}).map(([key, value]) => ({
    key,
    label: flagLabelMap[key] || key,
    isActive: Boolean(value),
  }));
}

export function formatNumber(value) {
  if (typeof value !== "number") return "—";
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function getCompanyResolutionSummary(item) {
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

export function getExcerptLines(item, limit = 8) {
  const excerpt = item?.source?.excerpt;
  if (!excerpt || typeof excerpt !== "string") return [];

  return excerpt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
}
