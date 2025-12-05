import { BatchFile } from "../types";

export const downloadText = (filename: string, content: string) => {
  const element = document.createElement("a");
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  
  // Safe filename handling
  const cleanName = filename ? filename.replace(/\.[^/.]+$/, "") : "Transcription";
  
  element.href = url;
  element.download = `${cleanName}.txt`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
};

export const downloadDoc = (filename: string, content: string) => {
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${filename}</title>
      <style>
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; }
        p { margin-bottom: 1em; }
      </style>
    </head>
    <body>`;
  
  const footer = "</body></html>";
  
  // Format content: treat double newlines as paragraphs
  const paragraphs = content.split(/\n\s*\n/);
  const htmlBody = paragraphs.map(p => {
      // Replace single newlines with <br/> inside paragraphs
      return `<p>${p.replace(/\n/g, '<br/>')}</p>`;
  }).join('');
  
  const sourceHTML = header + htmlBody + footer;
  
  // Use Blob with application/msword
  const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  
  // Safe filename handling
  const cleanName = filename ? filename.replace(/\.[^/.]+$/, "") : "Transcription";

  const element = document.createElement("a");
  element.href = url;
  element.download = `${cleanName}.doc`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  URL.revokeObjectURL(url);
};

export const exportBatch = async (files: BatchFile[], format: 'txt' | 'doc') => {
  let count = 0;
  for (const file of files) {
    if (file.transcript) {
      if (format === 'txt') {
        downloadText(file.fileName, file.transcript);
      } else {
        downloadDoc(file.fileName, file.transcript);
      }
      count++;
      // Add delay to prevent browser blocking multiple downloads
      await new Promise(resolve => setTimeout(resolve, 800));
    }
  }
  if (count === 0) {
    alert("No completed transcripts to export.");
  }
};