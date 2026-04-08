/* eslint-disable no-unused-vars */
import { motion } from "framer-motion";
import { DOMAIN_WIDTH, DOMAIN_HEIGHT } from "@/lib/careerGraph.constants";
import { MOTION } from "@/lib/careerGraph.motion";

export default function DomainPill({
  domain,
  motionNode,
  isActive = false,
  onMouseEnter,
  onMouseLeave,
  onClick,
}) {
  return (
    <motion.button
      type="button"
      className="absolute rounded-full border px-4 py-2 text-[12px] font-medium"
      style={{
        left: 0,
        top: 0,
        width: DOMAIN_WIDTH,
        height: DOMAIN_HEIGHT,
        textAlign: "center",
        x: motionNode.x,
        y: motionNode.y,
      }}
      initial={false}
      animate={{
        scale: isActive ? 1.04 : 1,
        borderColor: isActive ? "#c4b5fd" : "#e4e4e7",
        backgroundColor: isActive ? "#f5f3ff" : "#ffffff",
        color: isActive ? "#7c3aed" : "#71717a",
        boxShadow: isActive
          ? "0 4px 12px rgba(124, 58, 237, 0.12)"
          : "0 0 0 rgba(0, 0, 0, 0)",
        opacity: isActive ? 1 : 0.82,
      }}
      transition={{
        scale: MOTION.spring.emphasis,
        borderColor: {
          duration: MOTION.duration.normal,
          ease: MOTION.ease.out,
        },
        backgroundColor: {
          duration: MOTION.duration.normal,
          ease: MOTION.ease.out,
        },
        color: { duration: MOTION.duration.fast, ease: MOTION.ease.out },
        boxShadow: { duration: MOTION.duration.normal, ease: MOTION.ease.out },
        opacity: { duration: MOTION.duration.fast, ease: MOTION.ease.out },
      }}
      whileHover={{ scale: isActive ? 1.06 : 1.02 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      {domain.label}
    </motion.button>
  );
}
