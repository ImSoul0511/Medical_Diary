import { useCallback, useState } from "react";

export function useMockDelay(delayMs = 350) {
  const [isPending, setIsPending] = useState(false);

  const runWithDelay = useCallback(
    async (action: () => void) => {
      setIsPending(true);
      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
      action();
      setIsPending(false);
    },
    [delayMs],
  );

  return { isPending, runWithDelay };
}
