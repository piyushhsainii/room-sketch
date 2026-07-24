import { useEffect, useState } from "react";

export function useDelayedUnmount(active: boolean, delay = 160) {
  const [mounted, setMounted] = useState(active);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (active) {
      setMounted(true);
    } else {
      t = setTimeout(() => setMounted(false), delay);
    }
    return () => clearTimeout(t);
  }, [active, delay]);
  return mounted;
}
