import fs from 'fs';
import path from 'path';

export interface ServerRegistrationRequest {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  location: string;
  boardId: string;
  boardTitle: string;
  classId: string;
  classTitle: string;
  optedSubjectId?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'REMOVED';
  createdAt: string;
  reviewedAt?: string;
  username?: string;
  generatedPassword?: string;
  rejectReason?: string;
}

const DATA_DIR = path.join(process.cwd(), 'server', 'data');
const DATA_FILE = path.join(DATA_DIR, 'registration_requests.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readRequests(): ServerRegistrationRequest[] {
  try {
    ensureDataFile();
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content || '[]');
  } catch (err) {
    console.error('Failed to read registration requests file:', err);
    return [];
  }
}

function writeRequests(requests: ServerRegistrationRequest[]) {
  try {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(requests, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write registration requests file:', err);
  }
}

export const registrationStore = {
  getAll(): ServerRegistrationRequest[] {
    const list = readRequests();
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  getById(id: string): ServerRegistrationRequest | undefined {
    const list = readRequests();
    return list.find((r) => r.id === id);
  },

  getByEmail(email: string): ServerRegistrationRequest | undefined {
    const list = readRequests();
    const normalized = email.toLowerCase().trim();
    return list.find((r) => r.email.toLowerCase().trim() === normalized);
  },

  create(data: Omit<ServerRegistrationRequest, 'id' | 'status' | 'createdAt'>): ServerRegistrationRequest {
    const list = readRequests();
    const existing = list.find((r) => r.email.toLowerCase().trim() === data.email.toLowerCase().trim());
    
    // If an existing request exists for this email, update it to pending with fresh details
    if (existing) {
      existing.name = data.name;
      existing.firstName = data.firstName;
      existing.lastName = data.lastName;
      existing.age = data.age;
      existing.location = data.location;
      existing.boardId = data.boardId;
      existing.boardTitle = data.boardTitle;
      existing.classId = data.classId;
      existing.classTitle = data.classTitle;
      existing.optedSubjectId = data.optedSubjectId;
      existing.status = 'PENDING';
      existing.createdAt = new Date().toISOString();
      existing.reviewedAt = undefined;
      existing.rejectReason = undefined;
      writeRequests(list);
      return existing;
    }

    const newRequest: ServerRegistrationRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...data,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    list.unshift(newRequest);
    writeRequests(list);
    return newRequest;
  },

  approve(id: string, username: string, generatedPassword: string): ServerRegistrationRequest | null {
    const list = readRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    list[index].status = 'APPROVED';
    list[index].username = username;
    list[index].generatedPassword = generatedPassword;
    list[index].reviewedAt = new Date().toISOString();
    writeRequests(list);
    return list[index];
  },

  reject(id: string, reason?: string): ServerRegistrationRequest | null {
    const list = readRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    list[index].status = 'REJECTED';
    list[index].rejectReason = reason || 'Verification criteria not met.';
    list[index].reviewedAt = new Date().toISOString();
    writeRequests(list);
    return list[index];
  },

  remove(id: string, reason?: string): ServerRegistrationRequest | null {
    const list = readRequests();
    const index = list.findIndex((r) => r.id === id);
    if (index === -1) return null;

    list[index].status = 'REMOVED';
    list[index].rejectReason = reason || 'Student account removed and access revoked by administrator.';
    list[index].reviewedAt = new Date().toISOString();
    writeRequests(list);
    return list[index];
  },

  delete(id: string): boolean {
    const list = readRequests();
    const filtered = list.filter((r) => r.id !== id);
    writeRequests(filtered);
    return true;
  },

  syncExistingUsers(dbUsers: any[]) {
    const list = readRequests();
    let modified = false;

    for (const u of dbUsers) {
      const emailLower = u.email.toLowerCase().trim();
      const existing = list.find((r) => r.email.toLowerCase().trim() === emailLower);
      if (!existing) {
        list.push({
          id: u.id,
          name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Scholar Student',
          firstName: u.firstName || 'Scholar',
          lastName: u.lastName || 'Student',
          email: emailLower,
          age: u.studentProfile?.age ? String(u.studentProfile.age) : '17',
          location: u.studentProfile?.location || 'Tamil Nadu',
          boardId: u.studentProfile?.boardId || '',
          boardTitle: u.studentProfile?.board?.name || 'Tamil Nadu State Board',
          classId: u.studentProfile?.classId || '',
          classTitle: u.studentProfile?.class?.name || 'Class 12',
          optedSubjectId: '',
          status: 'APPROVED',
          createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
          reviewedAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
          username: emailLower.split('@')[0],
        });
        modified = true;
      }
    }

    if (modified) {
      writeRequests(list);
    }
  },

  getPendingCount(): number {
    const list = readRequests();
    return list.filter((r) => r.status === 'PENDING').length;
  }
};

