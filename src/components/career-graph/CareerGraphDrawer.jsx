import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import {
  getCompanyLabel,
  getDateRangeLabel,
  getSignalItems,
  getEvidenceFlags,
  formatNumber,
  getCompanyResolutionSummary,
  getExcerptLines,
} from "@/lib/careerGraph.formatters";
import { clamp01 } from "@/lib/careerGraph.layout";
import DrawerMetricLine from "./DrawerMetricLine";
import DrawerEvidenceFlag from "./DrawerEvidenceFlag";
import DrawerInfoBox from "./DrawerInfoBox";

export default function CareerGraphDrawer({
  isOpen,
  item,
  onClose,
  topOffset = 182,
}) {
  const scrollRef = useRef(null);

  // reset scroll uniquement au changement d'XP sélectionnée
  useEffect(() => {
    if (!isOpen || !item?.id || !scrollRef.current) return;

    scrollRef.current.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [isOpen, item?.id]);

  // listener Escape indépendant
  useEffect(() => {
    if (!isOpen) return;

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

  const DRAWER_BORDER_COMPENSATION = 1;

  return (
    <aside
      className={`w-[360px] overflow-hidden border-left bg-white shadow-xl transition-transform duration-300 ${
        isOpen ? "translate-x-[21px]" : "translate-x-[110%]"
      }`}
      style={{
        height: `calc(100dvh - ${topOffset}px - ${DRAWER_BORDER_COMPENSATION}px)`,
      }}
    >
      <div className="flex h-full flex-col border-l border-zinc-200">
        <div className="shrink-0 border-b border-zinc-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
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
              className="border border-zinc-200 p-2 text-zinc-500 transition hover:bg-zinc-50"
              type="button"
              aria-label="Fermer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable] px-5 py-5"
        >
          {item ? (
            <div className="space-y-5">
              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Domaines fonctionnels
                </div>
                <div className="flex flex-wrap gap-2">
                  {functionalDomains.map((domain, index) => (
                    <span
                      key={domain.code}
                      className={`inline-flex items-center border px-2.5 py-1 text-[11px] font-medium ${
                        index === 0
                          ? "border-violet-300 bg-violet-50 text-violet-700"
                          : "border-zinc-200 bg-zinc-50 text-zinc-700"
                      }`}
                    >
                      {domain.label}{" "}
                      {Math.round(clamp01(domain.score || 0) * 100)}%
                    </span>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Secteur d'activité
                </div>
                <div className="flex flex-wrap gap-2">
                  {contextDomains.length ? (
                    contextDomains.map((domain) => (
                      <span
                        key={domain.code}
                        className="inline-flex items-center border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-[11px] font-medium text-zinc-600"
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
                    <DrawerMetricLine
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
                    <DrawerEvidenceFlag
                      key={flag.key}
                      label={flag.label}
                      isActive={flag.isActive}
                    />
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                  Contenu Expérience (excerpts)
                </div>
                <div className="space-y-2 text-[12px] leading-5 text-zinc-600">
                  {excerptLines.length ? (
                    excerptLines.map((line, idx) => <div key={idx}>{line}</div>)
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
                    <div className="border border-zinc-200 bg-zinc-50 p-4">
                      <div className="font-bold text-zinc-900">
                        {company.name}
                      </div>
                      <div className="mt-1 text-sm text-zinc-500">
                        SIREN {company.siren || "—"}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <DrawerInfoBox label="Secteur" value={company.section} />
                      <DrawerInfoBox
                        label="Division"
                        value={company.division}
                      />
                      <DrawerInfoBox label="NAF" value={company.naf} />
                      <DrawerInfoBox
                        label="Taille / segment"
                        value={company.sizeSegment}
                      />
                      <DrawerInfoBox
                        label="Type organisation"
                        value={company.scope}
                      />
                      <DrawerInfoBox
                        label="Siège Social"
                        value={company.hqCity}
                      />
                      <DrawerInfoBox
                        label="Établissement matché"
                        value={company.matchedCity}
                      />
                      <DrawerInfoBox
                        label="Année finance"
                        value={company.financeYear}
                      />
                      <DrawerInfoBox
                        label="CA"
                        value={
                          company.revenue != null
                            ? `${formatNumber(company.revenue)} €`
                            : "—"
                        }
                      />
                      <DrawerInfoBox
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
                  <div className="border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-500">
                    Pas de résolution société exploitable sur cette expérience.
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
