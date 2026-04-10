import CareerGraphScene from "./CareerGraphScene";

export default function CareerGraphStage({ canvasWidth, sceneProps }) {
  return (
    <section
      className="relative overflow-hidden bg-white w-full flex"
      style={{ height: sceneProps.sceneHeight }}
    >
      <CareerGraphScene {...sceneProps} canvasWidth={canvasWidth} />
    </section>
  );
}
