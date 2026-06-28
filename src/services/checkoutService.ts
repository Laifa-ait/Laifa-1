import { auth } from '../lib/firebase';

const MIN_ORDER_AMOUNT = 100;

export const processCheckout = async (payload: any) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Veuillez vous connecter pour passer commande.");
    
    // Client-side minimum order validation
    if (payload.total && payload.total < MIN_ORDER_AMOUNT) {
      throw new Error(`Montant minimum de commande : ${MIN_ORDER_AMOUNT} DA`);
    }

    if (payload.useWallet && payload.walletAmount > 0) {
      if (payload.walletAmount > payload.total) {
        throw new Error("Le montant du wallet ne peut pas dépasser le total.");
      }
    }

    // Refresh token to ensure we have the latest claims and valid session
    let token = await user.getIdToken();
    
    let response = await fetch('/api/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 401 || response.status === 403) {
      token = await user.getIdToken(true); // force refresh
      response = await fetch('/api/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Use the new token
        },
        body: JSON.stringify(payload)
      });
    }
    
    const data = await response.json();
    if (!response.ok) {
       throw new Error(data.error || "Erreur critique lors du traitement de la commande.");
    }
    
    return { orderId: data.orderId, total: data.grandTotal, walletDeducted: data.walletAmountUsed, codAmount: data.grandTotal }; 
  } catch (error: any) {
    console.error("Erreur backend checkout:", error);
    throw new Error(error.message || "Erreur critique lors du traitement de la commande.");
  }
};

