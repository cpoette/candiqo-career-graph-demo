export default function DrawerInfoBox({ label, value }) {
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
