import { useEffect, useState } from "react";

// Keeps a panel mounted through its exit animation instead of hard-unmounting.
export function useAnimatedMount(isOpen: boolean, exitDurationMs = 160) {
  const [shouldRender, setShouldRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else if (shouldRender) {
      const t = setTimeout(() => setShouldRender(false), exitDurationMs);
      return () => clearTimeout(t);
    }
  }, [isOpen, exitDurationMs, shouldRender]);

  return shouldRender;
}
