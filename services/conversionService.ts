import { BatchFile, FileStatus } from "../types";

const NEEDS_CONVERSION_REGEX = /\.(dss|ds2|waptt)$/i;

/**
 * Checks if a file needs conversion based on extension
 */
export const needsConversion = (filename: string): boolean => {
  return NEEDS_CONVERSION_REGEX.test(filename);
};

/**
 * Simulates the conversion of proprietary audio formats to WAV.
 * In a real production environment, this would require ffmpeg.wasm or a backend service.
 */
export const convertFile = async (
  file: BatchFile, 
  onProgress: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 5;
      onProgress(progress);
      
      if (progress >= 100) {
        clearInterval(interval);
        resolve();
      }
    }, 150); // Simulate ~3 seconds conversion time
  });
};
