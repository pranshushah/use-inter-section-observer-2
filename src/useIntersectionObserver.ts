interface UseInterSectionObserverOptions extends IntersectionObserverInit {
  initialValue?: boolean;
}
class IntersectionObserverGenerator {
  public intersectionObserver: IntersectionObserver;
  private listeners = new Set<() => void>();
  // don't forget to emit changes whenvever we mutate isInView or entry.
  private isInView = false;
  private serverValue = false;
  private entry?: IntersectionObserverEntry;

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
  }

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
}
