import CareerGraphHeader from "@/components/career-graph/CareerGraphHeader";
import CareerGraphStage from "@/components/career-graph/CareerGraphStage";
import CareerGraphDrawer from "@/components/career-graph/CareerGraphDrawer";
import useCareerGraphModel from "@/hooks/useCareerGraphModel";

const TOPBAR_HEIGHT = 48;
const HEADER_HEIGHT = 130;
const DRAWER_TOP_OFFSET = TOPBAR_HEIGHT + HEADER_HEIGHT; // + page top padding

export default function CareerGraphPage({
  data = {},
  selectedCvId,
  setSelectedCvId,
  cvSamples,
}) {
  const model = useCareerGraphModel(data);

  return (
    <main className="bg-zinc-100">
      <div className="mx-auto max-w-[1600px] px-4 pt-4">
        <div className="border border-y-0 border-zinc-200 bg-white shadow-sm">
          <CareerGraphHeader
            eyebrow="Career Graph"
            title="Enchaînement Année / XP + lane parallèle + FD"
            description="Prototype minimal..."
            selectedCvId={selectedCvId}
            setSelectedCvId={setSelectedCvId}
            cvSamples={cvSamples}
          />
          {/* Wrapper flex : stage + drawer dans le même flux */}
          <div className="relative flex items-start">
            <CareerGraphStage
              timeline={model.timeline}
              canvasWidth={model.canvasWidth}
              sceneProps={{
                timeline: model.timeline,
                canvasWidth: model.canvasWidth,
                domains: model.domains,
                selectedItem: model.selectedItem,
                selectedXpId: model.selectedXpId,
                xpAnchors: model.xpAnchors,
                activeXpId: model.activeXpId,
                activeDomainIds: model.activeDomainIds,
                hoveredDomainId: model.hoveredDomainId,
                setHoveredXpId: model.setHoveredXpId,
                setHoveredDomainId: model.setHoveredDomainId,
                setSelectedXpId: model.setSelectedXpId,
              }}
            />

            <div
              className="sticky overflow-hidden p-0"
              style={{
                top: `${DRAWER_TOP_OFFSET}px`,
                marginLeft: `-380px`, // overlap sur le stage
                width: `380px`,
              }}
            >
              <CareerGraphDrawer
                isOpen={Boolean(model.selectedItem)}
                item={model.selectedItem}
                onClose={model.handleCloseDrawer}
                topOffset={DRAWER_TOP_OFFSET}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
