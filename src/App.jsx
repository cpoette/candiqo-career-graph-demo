import TopBar from "@/app/TopBar";
import CareerGraphPage from "@/pages/CareerGraphPage";
import Logo from "@/assets/brand/logo.svg?react";
import { useMemo, useState } from "react";
import { CV_SAMPLES } from "@/data/cv";

export default function App() {
  const [selectedCvId, setSelectedCvId] = useState(null);

  const selectedCv = useMemo(() => {
    if (!CV_SAMPLES.length) return null;
    return CV_SAMPLES.find((cv) => cv.id === selectedCvId) || CV_SAMPLES[0];
  }, [selectedCvId]);

  return (
    <div className="min-h-screen bg-zinc-100">
      <TopBar Logo={Logo} />

      <CareerGraphPage
        data={selectedCv?.xp_enrichment_by_id || {}}
        selectedCvId={selectedCv?.id}
        setSelectedCvId={setSelectedCvId}
        cvSamples={CV_SAMPLES}
      />
    </div>
  );
}
