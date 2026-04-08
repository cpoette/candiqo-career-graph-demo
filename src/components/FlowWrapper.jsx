import { useState } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

export default function FlowWrapper({ children }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div
      className={
        isFullscreen ? "fixed inset-0 z-50 bg-base-100" : "relative h-[760px]"
      }
    >
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        className="btn btn-sm btn-circle absolute right-4 top-4 z-50"
      >
        {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      <div className="h-full w-full">{children}</div>
    </div>
  );
}
