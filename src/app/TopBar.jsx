export default function TopBar({ Logo }) {
  return (
    <header className="sticky top-0 z-50 h-12 border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-full max-w-[1600px] items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {Logo ? <Logo className="h-6 w-auto text-primary" /> : null}
        </div>

        <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
          Career Graph Demo
        </div>
      </div>
    </header>
  );
}
