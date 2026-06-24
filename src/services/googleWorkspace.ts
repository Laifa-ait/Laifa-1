import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';

/**
 * Ce service gère les interactions côté client pour les APIs Google Workspace
 * via notre backend Node.js.
 */
let cachedGoogleToken: string | null = null;

// Instance de l'authentification Firebase existante (le config Firebase est déjà initialisé ailleurs)
export const getGoogleToken = async (forceRefresh = false): Promise<string> => {
  if (cachedGoogleToken && !forceRefresh) {
    return cachedGoogleToken;
  }

  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  
  // Demande des scopes nécessaires
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');

  // Paramétrer pour s'assurer que c'est un compte G-Suite (si besoin) ou forcer le prompt
  provider.setCustomParameters({
    prompt: 'select_account'
  });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential && credential.accessToken) {
      cachedGoogleToken = credential.accessToken;
      return cachedGoogleToken;
    } else {
      throw new Error("Impossible de récupérer le token d'accès Google.");
    }
  } catch (error) {
    console.error("Erreur de connexion Google Workspace", error);
    throw error;
  }
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 10000): Promise<Response> => {
  return Promise.race([
    fetch(url, options),
    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout)),
  ]);
};

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, timeout = 10000): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchWithTimeout(url, options, timeout);
      if (res.ok || res.status < 500) return res;
    } catch (err) {
      if (i === retries - 1) throw err;
    }
    await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // exponential backoff
  }
  throw new Error("Failed after retries");
};

/**
 * 1. Exporter les données vers Google Sheets
 */
export const exportPremiumToSheets = async (payload: any) => {
  const token = await getGoogleToken();
  const response = await fetchWithRetry('/api/workspace/sheets/export-premium', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-google-token': token
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erreur lors de l’export');
  }
  return response.json();
};

/**
 * 2. Upload Google Drive
 */
export const uploadToDrive = async (file: File) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64Data = (reader.result as string).split(',')[1];
                const token = await getGoogleToken();
                const response = await fetchWithRetry('/api/workspace/drive/upload', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-google-token': token
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        mimeType: file.type,
                        base64Data
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Erreur upload Drive");
                }
                
                resolve(await response.json());
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

/**
 * 2b. System Upload for KYC to Google Drive (No Google Token Required for the Seller)
 */
export const systemUploadKYCToDrive = async (file: File, sellerId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const base64Data = (reader.result as string).split(',')[1];
                const response = await fetchWithRetry('/api/workspace/drive/system-upload-kyc', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fileName: file.name,
                        mimeType: file.type,
                        base64Data,
                        sellerId
                    })
                });

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error || "Erreur upload System Drive");
                }
                
                const data = await response.json();
                resolve(data.file.webViewLink || data.file.id);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
};

/**
 * 3. Planifier une vérification Meet via Google Calendar
 */
export const scheduleVerificationMeet = async (sellerEmail: string | string[], startTime: string, endTime: string, summary?: string, description?: string) => {
    const token = await getGoogleToken();
    const response = await fetchWithRetry('/api/workspace/calendar/schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-google-token': token
        },
        body: JSON.stringify({
            sellerEmail: Array.isArray(sellerEmail) ? undefined : sellerEmail,
            sellerEmails: Array.isArray(sellerEmail) ? sellerEmail : undefined,
            startTime,
            endTime,
            summary,
            description
        })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Erreur lors de la création Meet');
    }
    
    return response.json();
};
