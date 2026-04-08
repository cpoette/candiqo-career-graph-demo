import CareerGraphScene from "./CareerGraphScene";

export default function CareerGraphStage({
  timeline,
  canvasWidth,
  sceneProps,
}) {
  return (
    <section
      className="relative overflow-hidden bg-white w-full flex"
      style={{ height: timeline.totalHeight }}
    >
      <CareerGraphScene {...sceneProps} canvasWidth={canvasWidth} />
    </section>
  );
}
