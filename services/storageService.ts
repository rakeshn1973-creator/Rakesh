
import { JobRecord, User, UserRole, LearningEntry, AppPermission } from "../types";
import { v4 as uuidv4 } from 'uuid';

const USERS_KEY = 'dragon_users';
const JOBS_KEY = 'dragon_jobs';
const LEARNING_KEY = 'dragon_learning';

// Helper to get default permissions based on role
const getDefaultPermissions = (role: UserRole): AppPermission[] => {
    switch (role) {
        case UserRole.SUPERADMIN:
            return [
                'CAN_UPLOAD_AUDIO', 'CAN_USE_LIVE_DICTATION', 'CAN_EXTRACT_INVOICES', 
                'CAN_VIEW_REPORTS', 'CAN_EDIT_TRANSCRIPTS', 'CAN_FINALIZE_JOBS', 'CAN_MANAGE_USERS'
            ];
        case UserRole.DOCTOR:
            return [
                'CAN_UPLOAD_AUDIO', 'CAN_USE_LIVE_DICTATION', 'CAN_EXTRACT_INVOICES', 
                'CAN_VIEW_REPORTS', 'CAN_EDIT_TRANSCRIPTS'
            ];
        case UserRole.TYPIST:
            return [
                'CAN_VIEW_REPORTS', 'CAN_EDIT_TRANSCRIPTS', 'CAN_FINALIZE_JOBS'
            ];
        default:
            return [];
    }
};

// Initialize default Superadmin if not exists
const initStorage = () => {
  const usersStr = localStorage.getItem(USERS_KEY);
  if (!usersStr) {
    const superAdmin: User = {
      id: 'admin-1',
      username: 'admin',
      fullName: 'System Administrator',
      role: UserRole.SUPERADMIN,
      authProvider: 'LOCAL',
      permissions: getDefaultPermissions(UserRole.SUPERADMIN),
      createdAt: Date.now()
    };
    // Default typist for demo
    const defaultTypist: User = {
        id: 'typist-1',
        username: 'typist',
        fullName: 'Jane Typist',
        role: UserRole.TYPIST,
        authProvider: 'LOCAL',
        permissions: getDefaultPermissions(UserRole.TYPIST),
        createdAt: Date.now()
    };
     // Default doctor for demo
     const defaultDoctor: User = {
        id: 'doctor-1',
        username: 'doctor',
        fullName: 'Dr. Smith',
        role: UserRole.DOCTOR,
        authProvider: 'LOCAL',
        permissions: getDefaultPermissions(UserRole.DOCTOR),
        createdAt: Date.now()
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([superAdmin, defaultTypist, defaultDoctor]));
  }
};

initStorage();

// --- User Management ---

export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  if (!stored) return [];
  
  const users: User[] = JSON.parse(stored);
  // Migration check: Ensure all users have permissions array
  return users.map(u => {
      if (!u.permissions) {
          u.permissions = getDefaultPermissions(u.role);
      }
      return u;
  });
};

export const addUser = (username: string, fullName: string, role: UserRole): User => {
  const users = getUsers();
  if (users.find(u => u.username === username)) {
    throw new Error("Username already exists");
  }
  const newUser: User = {
    id: uuidv4(),
    username,
    fullName,
    role,
    authProvider: 'LOCAL',
    permissions: getDefaultPermissions(role),
    createdAt: Date.now()
  };
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return newUser;
};

export const updateUserPermissions = (userId: string, permissions: AppPermission[]) => {
    const users = getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
        users[index].permissions = permissions;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
};

export const deleteUser = (id: string) => {
    let users = getUsers();
    users = users.filter(u => u.id !== id);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const loginUser = (username: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username);
  if (user && !user.permissions) {
      user.permissions = getDefaultPermissions(user.role);
  }
  return user || null;
};

export const loginOrRegisterGoogleUser = (email: string, fullName: string, avatarUrl: string): User => {
  const users = getUsers();
  let user = users.find(u => u.username === email || u.email === email);
  
  if (!user) {
      // Register new user automatically
      user = {
          id: uuidv4(),
          username: email,
          email: email,
          fullName: fullName,
          role: UserRole.TYPIST, // Default role for new Google signups
          avatarUrl: avatarUrl,
          authProvider: 'GOOGLE',
          permissions: getDefaultPermissions(UserRole.TYPIST),
          createdAt: Date.now()
      };
      users.push(user);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } else {
    // Update existing user info if needed
    let updated = false;
    if (!user.avatarUrl) {
       user.avatarUrl = avatarUrl;
       updated = true;
    }
    if (!user.email) {
        user.email = email;
        updated = true;
    }
    if (!user.permissions) {
        user.permissions = getDefaultPermissions(user.role);
        updated = true;
    }
    if (updated) {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
  }
  return user;
};

export const saveUserTemplate = (userId: string, templateBase64: string): User | null => {
    const users = getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) return null;

    users[userIndex].templateBase64 = templateBase64;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    
    return users[userIndex];
};

// --- Job / Reporting Management ---

export const getJobs = (): JobRecord[] => {
  const stored = localStorage.getItem(JOBS_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveJobRecord = (
  user: User, 
  fileName: string, 
  transcript: string, 
  audioLengthSeconds: number
): JobRecord => {
  const jobs = getJobs();
  
  // Generate a Job Number: JOB-YYYYMMDD-SEQUENCE
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const dailyCount = jobs.filter(j => j.jobNumber.includes(dateStr)).length + 1;
  const jobNumber = `JOB-${dateStr}-${String(dailyCount).padStart(3, '0')}`;

  const newJob: JobRecord = {
    id: uuidv4(),
    jobNumber,
    userId: user.id,
    userName: user.fullName,
    fileName,
    uploadDate: Date.now(),
    audioLengthSeconds,
    charCountWithSpaces: transcript.length,
    wordCount: transcript.trim().split(/\s+/).length,
    status: 'PENDING',
    originalTranscript: transcript,
    finalTranscript: transcript
  };

  jobs.push(newJob);
  localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
  return newJob;
};

export const assignJob = (jobId: string, typistId: string, typistName: string) => {
    const jobs = getJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    if (index !== -1) {
        jobs[index].assignedTypistId = typistId;
        jobs[index].assignedTypistName = typistName;
        jobs[index].status = 'ASSIGNED';
        localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));
    }
};

// --- Learning & Finalization ---

const getLearningEntries = (): LearningEntry[] => {
    const stored = localStorage.getItem(LEARNING_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getLearningContext = (): string => {
    const entries = getLearningEntries();
    if (entries.length === 0) return "";
    
    // Convert entries into a style guide for the prompt
    // We take the last 5 entries to keep prompt size manageable
    const recentEntries = entries.slice(-5);
    
    /* 
       In a real system, we would use diffing to find patterns.
       Here we simulate it by instructing the AI to pay attention to corrections.
    */
    return `
    REINFORCEMENT LEARNING FROM PREVIOUS CORRECTIONS:
    ${recentEntries.map(e => `- Note that users prefer phrasing similar to: "${e.correctedSnippet.substring(0, 50)}..."`).join('\n')}
    `;
};

export const finalizeJob = (jobId: string, finalText: string) => {
    const jobs = getJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    
    if (index !== -1) {
        const original = jobs[index].originalTranscript || "";
        
        jobs[index].finalTranscript = finalText;
        jobs[index].status = 'FINALIZED';
        jobs[index].charCountWithSpaces = finalText.length; // Update stats based on final
        
        localStorage.setItem(JOBS_KEY, JSON.stringify(jobs));

        // Simple learning simulation: 
        // If there's a significant difference, save it as a learning entry
        if (original !== finalText) {
            const learningEntries = getLearningEntries();
            learningEntries.push({
                id: uuidv4(),
                originalSnippet: original.substring(0, 100), // Simplified for demo
                correctedSnippet: finalText.substring(0, 100),
                timestamp: Date.now()
            });
            localStorage.setItem(LEARNING_KEY, JSON.stringify(learningEntries));
        }
    }
};

export const getDashboardStats = () => {
    const jobs = getJobs();
    const totalJobs = jobs.length;
    const pending = jobs.filter(j => j.status === 'PENDING').length;
    const finalized = jobs.filter(j => j.status === 'FINALIZED').length;
    
    // Group by doctor
    const doctors = getUsers().filter(u => u.role === UserRole.DOCTOR);
    const doctorStats = doctors.map(doc => {
        const docJobs = jobs.filter(j => j.userId === doc.id);
        return {
            id: doc.id,
            name: doc.fullName,
            total: docJobs.length,
            pending: docJobs.filter(j => j.status === 'PENDING').length,
            completed: docJobs.filter(j => j.status === 'FINALIZED').length
        };
    });

    return { totalJobs, pending, finalized, doctorStats };
};
