import imageCompression, { Options } from 'browser-image-compression';

/**
 * Compresse une image avant envoi.
 * - Max dimension: 1200px
 * - Max size: 1MB
 */
export async function compressImage(file: File): Promise<File> {
  const options: Options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/webp",
    initialQuality: 0.8,
  };

  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Erreur compression image:', error);
    // En cas d'échec, on retourne le fichier original
    return file;
  }
}
