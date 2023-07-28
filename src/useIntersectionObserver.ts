import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
export interface UseInterSectionObserverOptions extends IntersectionObserverInit {
  initialValue?: boolean;
  triggerOnce?: boolean;
}
class IntersectionObserverGenerator {
  public intersectionObserver: IntersectionObserver;
  private listeners = new Set<() => void>();
  private isInView = false;
  private serverValue = false;
  private entry?: IntersectionObserverEntry;
  private triggerOnce = false;
  private shouldEmitChanges = true;

  constructor(options: UseInterSectionObserverOptions) {
    const initialValue = options.initialValue;

    this.intersectionObserver = new IntersectionObserver(
      this.intersectionObserverCallback,
      options,
    );
    if (typeof initialValue === "boolean") {
      this.serverValue = initialValue;
      this.isInView = initialValue;
    }
    if (options.triggerOnce) {
      this.triggerOnce = options.triggerOnce;
    }
  }

  /**
   * @description emit changes to all listeners whenever the value of isInView or entrys changes
   */
  private emitChanges = () => {
    this.listeners.forEach((listener) => {
      listener();
    });
  };

  private intersectionObserverCallback = (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry) {
      this.isInView = entry.isIntersecting;
      this.entry = entry;
      this.emitChanges();
    }
  };

  public subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };

  public inViewSnapshot = () => {
    return this.isInView;
  };

  public entrySnapshot = () => {
    return this.entry;
  };

  public getServerValue = () => {
    return this.serverValue;
  };
}

export function useInterSectionObserver({
  root,
  rootMargin,
  threshold,
  initialValue,
}: UseInterSectionObserverOptions = {}) {
  if (typeof useSyncExternalStore !== "function" || !useSyncExternalStore) {
    throw new Error("use-intersection-observer-2 requires react@18.0.0 or higher");
  }
  const intersectionObserverRef = useRef<IntersectionObserver>(null);
  const subscribeAndSnapshotFunction: {
    subscribe: (cb: () => void) => () => void;
    inViewSnapshot: () => boolean;
    entrySnapshot: () => IntersectionObserverEntry | undefined;
    inViewSnapshotServer: () => boolean;
  } = useMemo(() => {
    const data = new IntersectionObserverGenerator({
      root,
      rootMargin,
      threshold,
      initialValue,
    });
    //@ts-ignore
    intersectionObserverRef.current = data.intersectionObserver;
    return {
      subscribe: data.subscribe,
      inViewSnapshot: data.inViewSnapshot,
      entrySnapshot: data.entrySnapshot,
      inViewSnapshotServer: data.getServerValue,
    };
  }, [root, rootMargin, threshold, initialValue]);

  const ref = useCallback((node: Element | null) => {
    if (
      intersectionObserverRef.current &&
      node &&
      intersectionObserverRef.current.takeRecords().length > 0
    ) {
      intersectionObserverRef.current.disconnect();
    }
    if (intersectionObserverRef.current && node) {
      intersectionObserverRef.current.observe(node);
    }
  }, []);

  const isInView = useSyncExternalStore(
    subscribeAndSnapshotFunction.subscribe,
    subscribeAndSnapshotFunction.inViewSnapshot,
    subscribeAndSnapshotFunction.inViewSnapshotServer,
  );

  const entry = useSyncExternalStore(
    subscribeAndSnapshotFunction.subscribe,
    subscribeAndSnapshotFunction.entrySnapshot,
  );
  return { isInView, entry, ref } as const;
}
