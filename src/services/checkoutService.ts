import { auth } from '../lib/firebase';

export const processCheckout = async (payload: any) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Veuillez vous connecter pour passer commande.");
    
    // Refresh token to ensure we have the latest claims and valid session
    const token = await user.getIdToken();
    
    const response = await fetch('/api/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    
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

