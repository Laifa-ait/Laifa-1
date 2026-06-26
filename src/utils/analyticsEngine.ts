export interface AnalyticsEvent {
  id: string;
  name: 'product_view' | 'add_to_cart' | 'remove_from_cart' | 'checkout_start' | 'purchase_complete' | 'wishlist_toggle' | 'search_query';
  timestamp: number;
  metadata: any;
  userEmail?: string;
}

class AnalyticsEngine {
  private eventQueue: AnalyticsEvent[] = [];
  private flushTimeout: any = null;

  private getStorageKey(): string {
    return 'olma_marketplace_analytics';
  }

  public track(
    name: AnalyticsEvent['name'],
    metadata: any = {}
  ): void {
    if (typeof window === 'undefined') return;

    try {
      const savedEvents = this.getEvents();
      
      const trimmed = savedEvents.slice(-499);
      
      const newEvent: AnalyticsEvent = {
        id: `evt_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`,
        name,
        timestamp: Date.now(),
        metadata,
        userEmail: typeof window !== 'undefined' ? (sessionStorage.getItem('currentUserEmail') || localStorage.getItem('currentUserEmail') || 'Visiteur Anonyme') : 'Visiteur Anonyme'
      };

      trimmed.push(newEvent);
      localStorage.setItem(this.getStorageKey(), JSON.stringify(trimmed));
      
      // Add to queue for server sync
      this.eventQueue.push(newEvent);
      this.scheduleFlush();

      if (process.env.NODE_ENV === "development") {
        (process.env.NODE_ENV === 'development' ? console.log : function(){})(
          `%c[Olma Analytics Engine] %cTracked "${name}"`,
          'color: #ea580c; font-weight: bold;',
          'color: #3f3f46;',
          metadata
        );
      }
    } catch (err) {
      console.error('Failed to log analytics event', err);
    }
  }

  private scheduleFlush() {
    if (this.flushTimeout) clearTimeout(this.flushTimeout);
    this.flushTimeout = setTimeout(() => this.flushEvents(), 3000);
  }

  private async flushEvents() {
    if (this.eventQueue.length === 0) return;
    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];
    
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      });
    } catch (err) {
      console.error("Failed to sync analytics events", err);
      // Revert events if failed? Simple fallback: don't revert for now.
    }
  }

  public getEvents(): AnalyticsEvent[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(this.getStorageKey());
      return data ? JSON.parse(data) : this.getSeedEvents();
    } catch (err) {
      return this.getSeedEvents();
    }
  }

  public clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.getStorageKey(), JSON.stringify([]));
  }

  // Pre-populate with realistic behavior records if empty, so the user has immediate insights to analyze
  private getSeedEvents(): AnalyticsEvent[] {
    const categories = ['Supermarché', 'Maison & Déco', 'Mode'];
    const products = [
      { id: '1', name: 'Miel de Sidr Royal de Ghardaïa', price: 9500, category: 'Supermarché' },
      { id: '2', name: 'Robe Kabyle Traditionnelle', price: 21000, category: 'Mode' },
      { id: '3', name: 'Vase Berbère en Argile Cuite', price: 6500, category: 'Supermarché' },
      { id: '4', name: 'Miroir Oeil Soleil en Rotin', price: 14000, category: 'Maison & Déco' }
    ];

    const seed: AnalyticsEvent[] = [];
    const baseTime = Date.now() - 3600000 * 24; // starting 24h ago

    for (let i = 0; i < 40; i++) {
      const timeOffset = Math.floor(Math.random() * 3600000 * 24);
      const randomProduct = products[Math.floor(Math.random() * products.length)];
      
      // 60% views, 20% add_to_cart, 10% searches, 5% wishlists, 5% purchases
      const roll = Math.random();
      if (roll < 0.5) {
        seed.push({
          id: `seed_view_${i}`,
          name: 'product_view',
          timestamp: baseTime + timeOffset,
          metadata: { productId: randomProduct.id, name: randomProduct.name, price: randomProduct.price, category: randomProduct.category },
          userEmail: 'amel.dz@gmail.com'
        });
      } else if (roll < 0.7) {
        seed.push({
          id: `seed_search_${i}`,
          name: 'search_query',
          timestamp: baseTime + timeOffset,
          metadata: { query: ['Kabyle', 'Sidr', 'Vase', 'Miroir'][Math.floor(Math.random() * 4)], resultsCount: Math.floor(Math.random() * 5) + 2 },
          userEmail: 'sofiane.oran@gmail.com'
        });
      } else if (roll < 0.85) {
        seed.push({
          id: `seed_cart_${i}`,
          name: 'add_to_cart',
          timestamp: baseTime + timeOffset,
          metadata: { productId: randomProduct.id, name: randomProduct.name, price: randomProduct.price, category: randomProduct.category },
          userEmail: 'farid.alger@outlook.com'
        });
      } else if (roll < 0.95) {
        seed.push({
          id: `seed_wishlist_${i}`,
          name: 'wishlist_toggle',
          timestamp: baseTime + timeOffset,
          metadata: { productId: randomProduct.id, name: randomProduct.name },
          userEmail: 'rym.constantine@gmail.com'
        });
      } else {
        seed.push({
          id: `seed_purchase_${i}`,
          name: 'purchase_complete',
          timestamp: baseTime + timeOffset,
          metadata: { orderId: `OR-${Math.floor(Math.random() * 9000) + 1000}`, totalAmount: randomProduct.price, itemsCount: 1, categories: [randomProduct.category] },
          userEmail: 'walid.tlemcen@gmail.com'
        });
      }
    }

    // Sort by timestamp
    return seed.sort((a, b) => a.timestamp - b.timestamp);
  }

  // Calculate dynamic analytics KPI summaries
  public getInsights() {
    const events = this.getEvents();
    
    let views = 0;
    let carts = 0;
    let purchases = 0;
    let totalRevenue = 0;
    
    const categoryHits: Record<string, number> = {};
    const productViews: Record<string, { name: string; count: number }> = {};
    const searchQueries: Record<string, number> = {};

    events.forEach(evt => {
      if (evt.name === 'product_view') {
        views++;
        const pId = evt.metadata.productId;
        const pName = evt.metadata.name;
        if (pId) {
          if (!productViews[pId]) productViews[pId] = { name: pName || pId, count: 0 };
          productViews[pId].count++;
        }
        
        const cat = evt.metadata.category;
        if (cat) {
          categoryHits[cat] = (categoryHits[cat] || 0) + 1;
        }
      } else if (evt.name === 'add_to_cart') {
        carts++;
        const cat = evt.metadata.category;
        if (cat) {
          categoryHits[cat] = (categoryHits[cat] || 0) + 1.5; // slight extra weight for intent
        }
      } else if (evt.name === 'purchase_complete') {
        purchases++;
        const amount = evt.metadata.totalAmount || 0;
        totalRevenue += amount;
      } else if (evt.name === 'search_query') {
        const queryVal = evt.metadata.query;
        if (queryVal) {
          searchQueries[queryVal] = (searchQueries[queryVal] || 0) + 1;
        }
      }
    });

    const conversionRate = views > 0 ? ((purchases / views) * 100).toFixed(1) : '0';
    const addToCartRate = views > 0 ? ((carts / views) * 100).toFixed(1) : '0';

    return {
      totalViews: views,
      totalCarts: carts,
      totalPurchases: purchases,
      totalRevenue,
      conversionRate,
      addToCartRate,
      categoryHits: Object.entries(categoryHits).map(([name, weight]) => ({ name, value: Math.round(weight) })),
      productViews: Object.values(productViews).sort((a, b) => b.count - a.count).slice(0, 5),
      searchQueries: Object.entries(searchQueries).map(([query, count]) => ({ query, count })).sort((a, b) => b.count - a.count).slice(0, 5)
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
