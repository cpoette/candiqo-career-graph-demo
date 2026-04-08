import useCareerGraphModel from "@/hooks/useCareerGraphModel";
import CareerGraphScene from "@/components/career-graph/CareerGraphScene";
import CareerGraphDrawer from "@/components/career-graph/CareerGraphDrawer";

export default function CareerGraphFlow({ data = {} }) {
  const model = useCareerGraphModel(data);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-[1600px] border border-zinc-200 bg-white p-8 shadow-sm">
        {/* HEADER */}
        <div className="mb-6">
          <h1 className="text-2xl font-black">Career Graph</h1>
        </div>

        {/* SCENE */}
        <div
          className="relative overflow-hidden border border-zinc-200 bg-zinc-50/60"
          style={{ height: model.timeline.totalHeight }}
        >
          <CareerGraphScene {...model} />

          <CareerGraphDrawer
            isOpen={Boolean(model.selectedItem)}
            item={model.selectedItem}
            onClose={model.handleCloseDrawer}
          />
        </div>
      </div>
    </div>
  );
}
