
export enum AppMode {
  UPLOAD = 'UPLOAD',
  LIVE = 'LIVE',
  REPORTS = 'REPORTS',
  USERS = 'USERS',
  INVOICE_EXTRACTOR = 'INVOICE_EXTRACTOR',
  MASTER_DASHBOARD = 'MASTER_DASHBOARD',
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
  durationSeconds?: number; // Added to capture audio length
  status: FileStatus;
  progress: number; 
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

// User Management Types
export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  DOCTOR = 'DOCTOR',
  TYPIST = 'TYPIST',
}

// Granular Permissions
export type AppPermission = 
  | 'CAN_UPLOAD_AUDIO'
  | 'CAN_USE_LIVE_DICTATION'
  | 'CAN_EXTRACT_INVOICES'
  | 'CAN_VIEW_REPORTS'
  | 'CAN_EDIT_TRANSCRIPTS'
  | 'CAN_FINALIZE_JOBS'
  | 'CAN_MANAGE_USERS';

export interface User {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  templateBase64?: string; // For Word Templates
  permissions: AppPermission[]; // List of specific rights
  createdAt: number;
}

// Reporting & Workflow Types
export interface JobRecord {
  id: string;
  jobNumber: string; // e.g., JOB-20231027-001
  userId: string; // The Doctor who owns this
  userName: string;
  fileName: string;
  uploadDate: number; // Timestamp
  audioLengthSeconds: number;
  charCountWithSpaces: number;
  wordCount: number;
  
  // Workflow fields
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED' | 'FINALIZED';
  assignedTypistId?: string;
  assignedTypistName?: string;
  originalTranscript?: string;
  finalTranscript?: string;
}

export interface LearningEntry {
  id: string;
  originalSnippet: string;
  correctedSnippet: string;
  timestamp: number;
}

// Invoice Extractor Types
export interface InvoiceData {
  id: string; // Internal ID
  fileName: string;
  status: 'PROCESSING' | 'COMPLETED' | 'ERROR';
  data?: {
    "Sl No": string;
    "Patient Name": string;
    "DOB": string;
    "Address": string;
    "Contact": string;
    "Email": string;
    "Insurance": string;
    "Membership": string;
    "Authorisation": string;
    "Amount": string;
    "Comments": string;
    [key: string]: string | undefined; // Allow flexible keys for template merging
  };
  error?: string;
}
