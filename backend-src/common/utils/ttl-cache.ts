/** Tiny in-process TTL cache for hot public reads (categories, banners, cities). */
export class TtlCache<T> {
  private value: T | undefined;
  private expiresAt = 0;

  constructor(private readonly ttlMs: number) {}

  get(): T | undefined {
    if (this.value === undefined || Date.now() >= this.expiresAt) {
      return undefined;
    }
    return this.value;
  }

  set(value: T): T {
    this.value = value;
    this.expiresAt = Date.now() + this.ttlMs;
    return value;
  }

  clear(): void {
    this.value = undefined;
    this.expiresAt = 0;
  }
}
