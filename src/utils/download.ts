export const forceDownload = async (url: string | undefined, filename: string) => {
  if (!url) return;
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  } catch (error) {
    console.error("Error downloading file", error);
    window.open(url, '_blank');
  }
};
