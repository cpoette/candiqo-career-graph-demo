export const MOTION = {
  spring: {
    position: {
      type: "spring",
      stiffness: 95,
      damping: 20,
      mass: 1,
    },
    emphasis: {
      type: "spring",
      stiffness: 220,
      damping: 20,
      mass: 0.8,
    },
  },
  duration: {
    fast: 0.16,
    normal: 0.2,
  },
  ease: {
    out: "easeOut",
  },
};
