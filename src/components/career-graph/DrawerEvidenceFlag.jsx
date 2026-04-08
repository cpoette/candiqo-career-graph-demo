export default function DrawerEvidenceFlag({ label, isActive }) {
  return (
    <div
      className={`flex items-center gap-2 text-[11px] ${
        isActive ? "text-zinc-700" : "text-zinc-400"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-zinc-300"
        }`}
      />
      <span>{label}</span>
    </div>
  );
}
