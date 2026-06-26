export class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTimes = new Map<string, number>();
  private states = new Map<string, "CLOSED" | "OPEN" | "HALF_OPEN">();
  
  constructor(
    private threshold = 5,
    private timeout = 30000 // 30 secondes
  ) {}
  
  async execute<T>(fn: () => Promise<T>, key = "global"): Promise<T> {
    const state = this.states.get(key) || "CLOSED";
    const lastFailureTime = this.lastFailureTimes.get(key) || 0;

    if (state === "OPEN") {
      if (Date.now() - lastFailureTime > this.timeout) {
        this.states.set(key, "HALF_OPEN");
      } else {
        throw new Error(`Circuit breaker is OPEN for key: ${key}`);
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess(key);
      return result;
    } catch (error) {
      this.onFailure(key);
      throw error;
    }
  }
  
  private onSuccess(key: string) {
    this.failures.set(key, 0);
    this.states.set(key, "CLOSED");
  }
  
  private onFailure(key: string) {
    const currentFailures = (this.failures.get(key) || 0) + 1;
    this.failures.set(key, currentFailures);
    this.lastFailureTimes.set(key, Date.now());
    if (currentFailures >= this.threshold) {
      this.states.set(key, "OPEN");
    }
  }
}

// Factory to create independent circuit breaker instances
export function createCircuitBreaker(threshold = 5, timeout = 30000): CircuitBreaker {
  return new CircuitBreaker(threshold, timeout);
}

// Independent breakers for separate domains
export const authBreaker = createCircuitBreaker(5, 30000);
export const orderBreaker = createCircuitBreaker(5, 30000);
export const catalogBreaker = createCircuitBreaker(5, 30000);

// Backward compatibility alias
export const firestoreBreaker = orderBreaker;

