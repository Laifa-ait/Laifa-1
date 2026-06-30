import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkSellerVelocityLimit } from '../utils/velocity';
import { admin, db } from '../config/firebase-admin';

vi.mock('../config/firebase-admin', () => {
  const updateMock = vi.fn();
  const getDocMock = vi.fn();
  const addAlertMock = vi.fn();
  const getOrdersMock = vi.fn();
  const getBuyerOrdersMock = vi.fn();
  const getBuyerMock = vi.fn();
  
  return {
    admin: {
      firestore: {
        FieldValue: {
          serverTimestamp: vi.fn(() => 'server-timestamp')
        }
      }
    },
    db: {
      collection: vi.fn((col) => {
        if (col === 'admin_alerts') {
          return { add: addAlertMock };
        }
        if (col === 'orders') {
          return {
            where: vi.fn((field, op, value) => {
              return {
                orderBy: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    get: field === 'sellerIds' ? getOrdersMock : getBuyerOrdersMock
                  }))
                }))
              };
            })
          };
        }
        if (col === 'users') {
          return {
            doc: vi.fn((id) => ({
              get: id.startsWith('buyer') ? getBuyerMock : getDocMock,
              update: updateMock
            }))
          };
        }
      })
    }
  };
});

describe('Velocity Limits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getDocMock = db.collection('users').doc('seller1').get as any;
  const updateMock = db.collection('users').doc('seller1').update as any;
  const addAlertMock = db.collection('admin_alerts').add as any;
  
  // Need to get the mocked `get` function for orders
  const getOrdersMock = db.collection('orders').where('sellerIds', 'array-contains', 'seller1').orderBy('createdAt', 'desc').limit(300).get as any;
  const getBuyerOrdersMock = db.collection('orders').where('userId', '==', 'buyer1').orderBy('createdAt', 'desc').limit(20).get as any;
  const getBuyerMock = db.collection('users').doc('buyer1').get as any;

  it('suspends seller when pending prepaid orders exceed 5', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopName: 'Test Shop' })
    });
    
    // Create 6 pending prepaid orders
    getOrdersMock.mockResolvedValue({
      docs: Array(6).fill(null).map((_, i) => ({
        id: `order${i}`,
        data: () => ({
          status: 'pending',
          paymentMethod: 'wallet',
          userId: 'buyer1'
        })
      }))
    });

    await checkSellerVelocityLimit('seller1');

    expect(updateMock).toHaveBeenCalledWith({
      isActive: false,
      is_active: false,
      velocitySuspended: true,
      bgSuspended_reason: 'Alerte Rouge : Limite de vélocité dépassée (6 commandes en attente non expédiées).'
    });

    expect(addAlertMock).toHaveBeenCalledWith(expect.objectContaining({
      type: 'velocity_kill_switch',
      sellerId: 'seller1',
      pendingCount: 6
    }));
  });

  it('ignores COD orders from unverified/new buyers to prevent DoS', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopName: 'Test Shop' })
    });
    
    // 6 pending COD orders
    getOrdersMock.mockResolvedValue({
      docs: Array(6).fill(null).map((_, i) => ({
        id: `order${i}`,
        data: () => ({
          status: 'pending',
          paymentMethod: 'cod',
          userId: 'buyer1'
        })
      }))
    });

    // Buyer has no successful purchases
    getBuyerOrdersMock.mockResolvedValue({ docs: [] });
    
    // Buyer is new
    getBuyerMock.mockResolvedValue({
      exists: true,
      data: () => ({ createdAt: new Date() })
    });

    await checkSellerVelocityLimit('seller1');

    // Should NOT have updated seller because pendingCount will be 0
    expect(updateMock).not.toHaveBeenCalled();
    expect(addAlertMock).not.toHaveBeenCalled();
  });

  it('counts COD orders from established buyers', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopName: 'Test Shop' })
    });
    
    getOrdersMock.mockResolvedValue({
      docs: Array(6).fill(null).map((_, i) => ({
        id: `order${i}`,
        data: () => ({
          status: 'pending',
          paymentMethod: 'cod',
          userId: 'buyer1'
        })
      }))
    });

    // Buyer has a delivered order (established)
    getBuyerOrdersMock.mockResolvedValue({
      docs: [{ data: () => ({ status: 'delivered' }) }]
    });

    getBuyerMock.mockResolvedValue({ exists: true, data: () => ({}) });

    await checkSellerVelocityLimit('seller1');

    // Should suspend because COD orders are verified
    expect(updateMock).toHaveBeenCalledWith(expect.objectContaining({
      velocitySuspended: true
    }));
  });

  it('re-activates seller when pending orders drop to 5 or less', async () => {
    getDocMock.mockResolvedValue({
      exists: true,
      data: () => ({ shopName: 'Test Shop', velocitySuspended: true })
    });
    
    // Only 3 pending orders
    getOrdersMock.mockResolvedValue({
      docs: Array(3).fill(null).map((_, i) => ({
        id: `order${i}`,
        data: () => ({
          status: 'pending',
          paymentMethod: 'wallet',
          userId: 'buyer1'
        })
      }))
    });

    await checkSellerVelocityLimit('seller1');

    expect(updateMock).toHaveBeenCalledWith({
      isActive: true,
      is_active: true,
      velocitySuspended: false,
      bgSuspended_reason: null
    });
  });
});
