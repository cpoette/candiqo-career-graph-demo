export default function CareerGraphHeader({
  eyebrow,
  title,
  description,
  selectedCvId,
  setSelectedCvId,
  cvSamples = [],
}) {
  return (
    <div className="sticky top-12 z-30 border-b border-zinc-200 bg-white px-6 py-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            {eyebrow}
          </div>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-zinc-900">
            {title}
          </h1>

          {description ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
              {description}
            </p>
          ) : null}
        </div>

        {/* SELECT CV */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">CV :</span>

          <select
            value={selectedCvId || ""}
            onChange={(e) => setSelectedCvId(e.target.value)}
            className="rounded border border-zinc-200 px-2 py-1 text-sm"
          >
            {cvSamples.map((cv) => (
              <option key={cv.id} value={cv.id}>
                {cv.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
