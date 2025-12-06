import { BatchFile, InvoiceData, User } from "../types";
import * as XLSX from 'xlsx';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import FileSaver from 'file-saver';

// Safe extraction of saveAs whether it's a default function or a named property
const saveAs = (FileSaver as any).saveAs || FileSaver;

// Safe extraction for PizZip and Docxtemplater constructors
const PizZipConstructor = (PizZip as any).default || PizZip;
const DocxtemplaterConstructor = (Docxtemplater as any).default || Docxtemplater;


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

export const exportInvoiceToExcel = (invoices: InvoiceData[]) => {
    // Filter only completed
    const completed = invoices
        .filter(i => i.status === 'COMPLETED' && i.data)
        .map(i => i.data);

    if (completed.length === 0) {
        alert("No extracted data available to export.");
        return;
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(completed, {
        header: [
            "Sl No", "Patient Name", "DOB", "Address", "Contact", "Email", 
            "Insurance", "Membership", "Authorisation", "Amount", "Comments"
        ]
    });

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");

    // Generate filename: Invoice_DDMMYYYY.xlsx
    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
    const filename = `Invoice_${dateStr}.xlsx`;

    // Export
    XLSX.writeFile(wb, filename);
};

// --- Template Processing ---

const base64ToBinary = (base64: string) => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

// Helper for "19th September, 2025" format
const getOrdinalDate = () => {
    const date = new Date();
    const day = date.getDate();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();

    const suffix = ["th", "st", "nd", "rd"];
    const v = day % 100;
    const ordinal = day + (suffix[(v - 20) % 10] || suffix[v] || suffix[0]);

    return `${ordinal} ${month}, ${year}`;
};

export const generateWordFromTemplate = (
    templateBase64: string, 
    transcript: string, 
    invoiceData: any
) => {
    try {
        const zip = new PizZipConstructor(base64ToBinary(templateBase64));
        const doc = new DocxtemplaterConstructor(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // Current Dates
        const dateOrdinal = getOrdinalDate(); // 19th September, 2025
        const dateShort = new Date().toLocaleDateString('en-GB'); // 19/09/2025

        // Prepare Data Object with Robust Aliases
        // This ensures {Tel} works even if our data is called {Contact}
        const rawData = invoiceData || {};
        
        const data = {
            ...rawData,
            
            // Text Content Aliases
            "Body": transcript,
            "Transcript": transcript, 
            "Report": transcript,
            "Content": transcript,
            "Text": transcript,
            
            // Date Aliases
            "Date": dateOrdinal,          // 19th September, 2025
            "CurrentDate": dateOrdinal,   // 19th September, 2025
            "ShortDate": dateShort,       // 19/09/2025
            
            // Contact Aliases
            "Tel": rawData.Contact || "",
            "Phone": rawData.Contact || "",
            "Mobile": rawData.Contact || "",
            
            // Patient Aliases
            "Patient": rawData["Patient Name"] || "",
            "Name": rawData["Patient Name"] || "",
            "PatientName": rawData["Patient Name"] || "",
            
            // Address/DOB Aliases
            "Dob": rawData.DOB || "",
            "Address": rawData.Address || ""
        };

        // Render the document
        doc.render(data);

        // Generate Blob
        const out = doc.getZip().generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // Save
        // Filename: Patient Name_DDMMYYYY.docx
        const safeDate = dateShort.replace(/\//g, '');
        const patientName = data.Patient || "Document";
        const filename = `${patientName}_${safeDate}.docx`;

        saveAs(out, filename);

        return true;
    } catch (error: any) {
        console.error("Template Generation Error:", error);
        if (error.properties && error.properties.errors) {
            const errorMessages = error.properties.errors.map((e: any) => e.message).join('\n');
            alert(`Template Error:\n${errorMessages}`);
        } else {
            alert("Failed to generate document. Please check if your template is valid.");
        }
        return false;
    }
};