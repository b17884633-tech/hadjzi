/**
 * Small in-process key → value cache with per-entry TTL and a hard size cap.
 * Used to shave a DB round-trip off hot per-request lookups (e.g. JWT → user).
 */
export class KeyedTtlCache<V> {
  private readonly entries = new Map<string, { value: V; expiresAt: number }>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 5000,
  ) {}

  get(key: string): V | undefined {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (Date.now() >= hit.expiresAt) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V): V {
    if (this.entries.size >= this.maxEntries) {
      // Map preserves insertion order → drop the oldest entry.
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    return value;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
