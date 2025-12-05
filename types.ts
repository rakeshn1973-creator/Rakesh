export enum AppMode {
  UPLOAD = 'UPLOAD',
  LIVE = 'LIVE',
}

export enum FileStatus {
  QUEUED = 'QUEUED',
  CONVERTING = 'CONVERTING',
  READY_TO_TRANSCRIBE = 'READY_TO_TRANSCRIBE',
  TRANSCRIBING = 'TRANSCRIBING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface BatchFile {
  id: string;
  originalFile: File;
  fileName: string;
  fileSize: number;
  status: FileStatus;
  progress: number; // 0-100, used for both conversion and transcription
  transcript: string;
  error?: string;
  createdAt: number;
}

export interface LiveSessionState {
  isActive: boolean;
  isConnecting: boolean;
  volume: number;
  error: string | null;
}
