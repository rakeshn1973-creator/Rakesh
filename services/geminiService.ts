import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { fileToBase64 } from "../utils/audioUtils";
import { formatDictationText } from "../utils/textFormatting";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const TRANSCRIPTION_MODEL = 'gemini-2.5-flash';
const VISION_MODEL = 'gemini-2.5-flash'; // Supports images
const LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const transcribeAudioFile = async (
  file: File, 
  learningContext: string = "",
  onProgress?: (msg: string) => void
): Promise<string> => {
  try {
    if (onProgress) onProgress("Reading audio file...");
    const base64Data = await fileToBase64(file);

    if (onProgress) onProgress("Analyzing with Medical Model...");
    
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("File is too large for browser-based processing. Please use files under 20MB.");
    }

    const prompt = `
      You are an expert medical transcriptionist.
      Transcribe the following audio file verbatim, but apply the following formatting rules strictly:

      1. **Formatting Commands**: Interpret spoken commands like "new paragraph", "next line", "full stop", "period", "comma", "colon", "open quote", "close quote", "open bracket", "close bracket". Do NOT write these words; apply the corresponding punctuation or formatting (e.g., "\n\n" for "new paragraph", "." for "period").
      2. **Contractions**: Expand ALL contractions to their formal full form (e.g., change "I'll" to "I will", "can't" to "cannot", "it's" to "it is", "patient's" (possession) stays as is).
      3. **Filler Words**: Remove all conversational fillers (e.g., "um", "uh", "ah", "like", "you know").
      4. **Medical Accuracy**: Ensure correct spelling of all medical terminology, drug names, and dosages.
      5. **Structure**: Return only the final clean transcription.
      
      ${learningContext}
    `;

    const response = await ai.models.generateContent({
      model: TRANSCRIPTION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type || 'audio/mp3', 
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || "No transcription generated.";
  } catch (error: any) {
    console.error("Transcription error:", error);
    throw new Error(error.message || "Failed to transcribe audio.");
  }
};

export const extractInvoiceData = async (file: File): Promise<any> => {
  try {
    const base64Data = await fileToBase64(file);
    
    const prompt = `
      MODULE NAME: Image-to-Invoice Data Extractor (I2I-Module)

      You are an AI agent designed to extract structured data from uploaded medical or billing images using OCR and intelligent text interpretation.

      Your Tasks:
      Perform OCR on the uploaded image(s).
      Detect and extract the following fields from the image content:
      Sl No, Patient Name, DOB, Address, Contact, Email, Insurance, Membership, Authorisation, Amount

      Apply smart logic:
      If Insurance is missing → mark as “Self-Pay”.
      Standardise DOB to DD/MM/YYYY (British format).
      Fix OCR noise, spacing, and common recognition errors.
      Capitalise names correctly.
      
      Important: Do not extract Comments. The Comments field must always be an empty string because OCR is not accurate enough for this field.

      Output Format:
      Return results as a single valid JSON object (not markdown, just the JSON string) in the following format:
      {
      "Sl No": "",
      "Patient Name": "",
      "DOB": "",
      "Address": "",
      "Contact": "",
      "Email": "",
      "Insurance": "",
      "Membership": "",
      "Authorisation": "",
      "Amount": "",
      "Comments": ""
      }

      Behaviour Rules:
      Never fabricate fields.
      If uncertain, return an empty string.
      Always ensure fully structured JSON output.
      Always leave "Comments" field empty.
    `;

    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      }
    });

    let jsonStr = response.text || "{}";
    // Sanitize JSON if it comes wrapped in markdown
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(jsonStr);
  } catch (error: any) {
    console.error("Invoice extraction error:", error);
    throw new Error("Failed to process image.");
  }
}

/**
 * Manages a Live API session for real-time dictation
 */
export class LiveDictationSession {
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private audioStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  
  constructor(
    private onTranscription: (text: string, isFinal: boolean) => void,
    private onError: (error: Error) => void
  ) {}

  async connect() {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000,
      });

      this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      this.sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        callbacks: {
          onopen: () => {
            this.startAudioStreaming();
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
               const text = message.serverContent.inputTranscription.text;
               if (text) {
                 // Apply formatting to the live stream text
                 const formatted = formatDictationText(text);
                 this.onTranscription(formatted, false); 
               }
            }
            
            if (message.serverContent?.turnComplete) {
                this.onTranscription("", true); 
            }
          },
          onerror: (e: ErrorEvent) => {
            this.onError(new Error("Live session error"));
          },
          onclose: (e: CloseEvent) => {
            console.log("Session closed");
          }
        },
        config: {
            responseModalities: [Modality.AUDIO], 
            inputAudioTranscription: { model: "google-provided-model" },
            systemInstruction: "You are a passive listener. You do not speak. You only listen.", 
        }
      });
      
    } catch (err: any) {
      this.onError(err);
    }
  }

  private startAudioStreaming() {
    if (!this.inputAudioContext || !this.audioStream || !this.sessionPromise) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.audioStream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = this.createBlob(inputData);
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    const uint8 = new Uint8Array(int16.buffer);
    
    // Manual base64 encoding
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Data = btoa(binary);

    return {
      data: base64Data,
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  disconnect() {
    if (this.sessionPromise) {
        this.sessionPromise.then(s => s.close());
    }
    this.source?.disconnect();
    this.processor?.disconnect();
    this.audioStream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    
    this.sessionPromise = null;
    this.inputAudioContext = null;
    this.audioStream = null;
  }
}