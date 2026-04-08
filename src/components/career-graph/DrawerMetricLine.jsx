export default function DrawerMetricLine({ label, value, group = "posture" }) {
  const groupMeta = {
    posture: { bar: "bg-emerald-500" },
    level: { bar: "bg-indigo-500" },
    dynamics: { bar: "bg-amber-600" },
  };

  const meta = groupMeta[group] || groupMeta.posture;
  const isZero = value === 0;

  return (
    <div
      className={`grid grid-cols-[96px_1fr_42px] items-center gap-3 text-[11px] ${
        isZero ? "opacity-45" : "opacity-100"
      }`}
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
