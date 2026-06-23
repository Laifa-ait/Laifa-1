export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  
  constructor(
    private threshold = 5,
    private timeout = 30000 // 30 secondes
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = "CLOSED";
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = "OPEN";
    }
  }
}

export const firestoreBreaker = new CircuitBreaker(5, 30000);
