import { Router } from "express";
import { google } from "googleapis";
import { Readable } from "stream";

const router = Router();

// Middleware pour extraire le Google Access Token
// Doit être passé depuis le frontend via un header spécial par exemple: x-google-token
const requireGoogleToken = (req: any, res: any, next: any) => {
  const token = req.headers["x-google-token"];
  if (!token) {
    return res.status(401).json({ error: "Google access token manquant. Veuillez lier votre compte Google Workspace." });
  }
  req.googleToken = token;
  next();
};

/**
 * 1. GOOGLE SHEETS (Export Premium "Canva-like")
 * Exportation des rapports formatés (Admin & Vendeur).
 */
router.post("/sheets/export-premium", requireGoogleToken, async (req: any, res: any) => {
  try {
    const { title, metadata, headers, rows, totals, theme } = req.body;
    
    // Theme defaults
    const headerBgColor = theme?.headerColor || { red: 0.1, green: 0.6, blue: 0.4 }; 
    const isRtl = theme?.isRtl || false;

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: req.googleToken });
    const sheets = google.sheets({ version: "v4", auth });

    // 1. Création du document
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: title || "Export OLMART" },
        sheets: [
            {
                properties: {
                    title: "Rapport",
                    rightToLeft: isRtl
                }
            }
        ]
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    const sheetId = spreadsheet.data.sheets?.[0].properties?.sheetId || 0;

    if (!spreadsheetId) {
        throw new Error("Impossible de créer le document");
    }

    // 2. Assemblage des données (Metadata + Espace + Headers + Rows + Totals)
    const emptyRow = Array(headers.length).fill("");
    
    // Remplissage progressif pour conserver les index de lignes
    let allValues: any[] = [];
    
    const metaStartIndex = 0;
    const metaDatas = metadata || [];
    allValues = allValues.concat(metaDatas);
    
    allValues.push(emptyRow); // Space before table
    
    const headerIndex = allValues.length;
    allValues.push(headers);
    
    const rowsStartIndex = allValues.length;
    allValues = allValues.concat(rows);
    
    const totalsStartIndex = allValues.length;
    allValues = allValues.concat(totals);

    // 3. Injection simple des valeurs d'abord
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Rapport!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allValues }
    });

    // 4. Application du Design Premium via batchUpdate
    const requests: any[] = [];

    // A. Formater le Titre Principal (Ligne 1)
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: {
                userEnteredFormat: {
                    textFormat: { bold: true, fontSize: 14, foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 } },
                    horizontalAlignment: isRtl ? "RIGHT" : "LEFT",
                }
            },
            fields: "userEnteredFormat(textFormat,horizontalAlignment)"
        }
    });

    // B. Formater les Metadata (Lignes 2 à 4)
    if (metaDatas.length > 1) {
        requests.push({
            repeatCell: {
                range: { sheetId, startRowIndex: 1, endRowIndex: metaDatas.length, startColumnIndex: 0, endColumnIndex: headers.length },
                cell: {
                    userEnteredFormat: {
                        textFormat: { fontSize: 10, italic: true, foregroundColor: { red: 0.3, green: 0.3, blue: 0.3 } },
                    }
                },
                fields: "userEnteredFormat(textFormat)"
            }
        });
    }

    // C. Formater les Headers du tableau "Design Canva"
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: headerIndex, endRowIndex: headerIndex + 1, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: {
                userEnteredFormat: {
                    backgroundColor: headerBgColor,
                    textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: "CENTER",
                    verticalAlignment: "MIDDLE"
                }
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)"
        }
    });

    // D. Formater les Lignes avec padding et bordures discrètes
    requests.push({
        repeatCell: {
            range: { sheetId, startRowIndex: rowsStartIndex, endRowIndex: totalsStartIndex, startColumnIndex: 0, endColumnIndex: headers.length },
            cell: {
                userEnteredFormat: {
                    textFormat: { fontSize: 10, foregroundColor: { red: 0.2, green: 0.2, blue: 0.2 } },
                    borders: {
                        bottom: { style: "SOLID", width: 1, color: { red: 0.9, green: 0.9, blue: 0.9 } }
                    }
                }
            },
            fields: "userEnteredFormat(textFormat,borders)"
        }
    });

    // E. Formater la Ligne de Totalisation (Gris clair, Gras)
    if (totals && totals.length > 0) {
        requests.push({
            repeatCell: {
                range: { sheetId, startRowIndex: totalsStartIndex, endRowIndex: totalsStartIndex + totals.length, startColumnIndex: 0, endColumnIndex: headers.length },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 },
                        textFormat: { bold: true, fontSize: 11, foregroundColor: { red: 0.1, green: 0.1, blue: 0.1 } },
                        borders: { top: { style: "SOLID_MEDIUM", width: 2, color: { red: 0.7, green: 0.7, blue: 0.7 } } }
                    }
                },
                fields: "userEnteredFormat(backgroundColor,textFormat,borders)"
            }
        });
    }

    // F. Ajustement de la largeur des colonnes
    requests.push({
        autoResizeDimensions: {
            dimensions: {
                sheetId,
                dimension: "COLUMNS",
                startIndex: 0,
                endIndex: headers.length
            }
        }
    });

    if (requests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: { requests }
        });
    }

    return res.json({ 
      success: true, 
      spreadsheetId, 
      spreadsheetUrl: spreadsheet.data.spreadsheetUrl 
    });

  } catch (error: any) {
    console.error("Erreur Google Sheets Export Premium:", error);
    let errorMsg = "Échec de l'exportation Sheets";
    if (error.code === 401 || error.code === 403) errorMsg = "Accès refusé ou Token expiré. Reconnectez-vous.";
    if (error.code === 429) errorMsg = "Quota de requêtes Google API atteint. Veuillez patienter.";
    
    res.status(error.code || 500).json({ error: errorMsg, details: error.message });
  }
});

/**
 * 2. GOOGLE DRIVE (User Upload - Admin Backup / Admin Docs)
 * Upload sécurisé avec le token de l'utilisateur.
 */
router.post("/drive/upload", requireGoogleToken, async (req: any, res: any) => {
  try {
    const { fileName, mimeType, base64Data } = req.body;
    
    if (!base64Data) {
       return res.status(400).json({ error: "Aucune donnée de fichier reçue." });
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: req.googleToken });
    const drive = google.drive({ version: "v3", auth });

    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = { name: fileName || `Upload-Olmart-${Date.now()}` };
    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    return res.json({ success: true, file: file.data });

  } catch (error: any) {
    console.error("Erreur Google Drive Upload:", error);
    let errorMsg = "Échec de l'upload Drive";
    if (error.code === 401 || error.code === 403) errorMsg = "Accès refusé ou Token expiré. Reconnectez-vous.";
    if (error.code === 429) errorMsg = "Quota de requêtes Google API atteint. Veuillez patienter.";
    
    res.status(error.code || 500).json({ error: errorMsg, details: error.message });
  }
});

/**
 * 2b. GOOGLE DRIVE (System Upload - Vendeur KYC)
 * Upload sécurisé via un Compte de Service (Service Account) pour les vendeurs,
 * car le Vendeur n'a pas accès au Google Drive de l'Admin !
 */
router.post("/drive/system-upload-kyc", async (req: any, res: any) => {
  try {
    const { fileName, mimeType, base64Data, sellerId } = req.body;
    
    if (!base64Data || !sellerId) {
       return res.status(400).json({ error: "Données de fichier ou ID vendeur manquant." });
    }

    // Stratégie Service Account expliquée dans la doc:
    // Le Service Account permet d'agir en tant que "système backend" sans interaction UI.
    const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY; // doit être défini en base64
    
    let auth;
    if (serviceAccountKey) {
        const credentials = JSON.parse(Buffer.from(serviceAccountKey, 'base64').toString('ascii'));
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
    } else {
        // Mode développement / Démo (simule la sauvegarde si pas de clé de service)
        console.warn("ATTENTION: Pas de GOOGLE_SERVICE_ACCOUNT_KEY. Le fichier n'est pas envoyé sur Drive (Mode Démo).");
        return res.json({ 
            success: true, 
            file: { webViewLink: `https://drive.google.com/demo-link-kyc/${sellerId}`, id: `mock-id-${Date.now()}` },
            demoMode: true
        });
    }

    const drive = google.drive({ version: "v3", auth });

    const buffer = Buffer.from(base64Data, 'base64');
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    const fileMetadata = { 
        name: `KYC_${sellerId}_${fileName}`,
        description: `Document KYC pour le vendeur: ${sellerId}`
    };
    const media = {
      mimeType: mimeType || 'application/octet-stream',
      body: stream,
    };

    const file = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    return res.json({ success: true, file: file.data });

  } catch (error: any) {
    console.error("Erreur Google Drive System Upload:", error);
    res.status(error.code || 500).json({ error: "Échec de l'upload KYC system Drive", details: error.message });
  }
});


/**
 * 3. GOOGLE MEET & CALENDAR
 * Prise de RDV pour la vérification des nouveaux vendeurs.
 */
router.post("/calendar/schedule", requireGoogleToken, async (req: any, res: any) => {
    try {
        const { sellerEmail, sellerEmails, startTime, endTime, summary, description } = req.body;

        if (!sellerEmail && (!sellerEmails || sellerEmails.length === 0) || !startTime || !endTime) {
            return res.status(400).json({ error: "Informations incomplètes (email, startTime, endTime requis)." });
        }

        const auth = new google.auth.OAuth2();
        auth.setCredentials({ access_token: req.googleToken });
        const calendar = google.calendar({ version: "v3", auth });

        // Compile all attendee emails dynamically
        const googleEmailsSet = new Set<string>();

        // 1. Add from single or comma-separated string
        if (sellerEmail && typeof sellerEmail === 'string') {
            sellerEmail.split(',').forEach(e => {
                const trimmed = e.trim();
                if (trimmed && trimmed.includes('@')) {
                    googleEmailsSet.add(trimmed);
                }
            });
        }

        // 2. Add from explicit array of string emails
        if (sellerEmails && Array.isArray(sellerEmails)) {
            sellerEmails.forEach(e => {
                if (typeof e === 'string') {
                    const trimmed = e.trim();
                    if (trimmed && trimmed.includes('@')) {
                        googleEmailsSet.add(trimmed);
                    }
                }
            });
        }

        if (googleEmailsSet.size === 0) {
            return res.status(400).json({ error: "Aucune adresse email valide trouvée pour l'invitation." });
        }

        const attendees = Array.from(googleEmailsSet).map(email => ({ email }));

        // Structure de l'événement avec tous les participants
        const event = {
            summary: summary || '📞 OLMART - Session KYC / Vérification de Boutique',
            description: description || 'Session d’approbation de votre boutique sur OLMART. Merci de vous munir de vos documents d’identité et registre de commerce.',
            start: { dateTime: startTime },
            end: { dateTime: endTime },
            attendees: attendees,
            conferenceData: {
                createRequest: {
                    requestId: `verify-${Date.now()}`,
                    conferenceSolutionKey: { type: 'hangoutsMeet' }
                }
            }
        };

        // Création de l'événement avec Google Meet intégré (conferenceDataVersion: 1)
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all' // Envoie l'invitation à tous les participants
        });

        // Retourne le lien Google Meet généré et l'ID de l'event pour synchroniser sur Firestore
        return res.json({ 
            success: true, 
            eventId: response.data.id,
            meetLink: response.data.hangoutLink,
            calendarLink: response.data.htmlLink
        });
    } catch(error: any) {
        console.error("Erreur Calendar/Meet:", error);
        let errorMsg = "Échec de la création du Meet";
        if (error.code === 401 || error.code === 403) errorMsg = "Accès refusé ou Token expiré. Reconnectez-vous.";
        if (error.code === 429) errorMsg = "Quota de requêtes Google API atteint. Veuillez patienter.";
        
        res.status(error.code || 500).json({ error: errorMsg, details: error.message });
    }
});

export default router;
