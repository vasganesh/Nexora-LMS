import type { Profile } from "../store/types";

const STORAGE_KEY = "nexoralearning_registered_students";

const defaultStudent: Profile = {
  id: "student-001",
  name: "Prathamesh Sharma",
  username: "prathamesh",
  password: "1234",
  email: "prathamesh@nexoralearning.in",
  role: "student",
  age: "17",
  location: "Chennai",
  selectedBoardId: "tnsb",
  selectedClassId: "class-12",
  optedSubjectId: "maths-12",
  xp: 2100,
  level: 7,
  coins: 84,
  streak: 9,
  achievements: [
    {
      id: "ach-1",
      title: "Fresh Scholar",
      description: "Created an Nexora Learning account",
      icon: "🌱",
      unlockedAt: new Date().toLocaleDateString("en-IN"),
    },
  ],
  certificates: [],
};

export const getRegisteredStudents = (): Profile[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as Profile[];
      if (Array.isArray(stored) && stored.length > 0) {
        return stored;
      }
    } catch {
      // fall through to reset storage
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultStudent]));
  return [defaultStudent];
};

export const saveRegisteredStudent = (student: Profile) => {
  const students = getRegisteredStudents();
  const filtered = students.filter(
    (existing) => existing.username !== student.username,
  );
  const updated = [student, ...filtered];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

export const removeRegisteredStudent = (identifier: string) => {
  const students = getRegisteredStudents();
  const normalized = identifier.toLowerCase().trim();
  const updated = students.filter(
    (s) => s.username?.toLowerCase() !== normalized && s.email?.toLowerCase() !== normalized
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
};

// ── Registration Requests Store ──────────────────────────────────────────────
const REGISTRATION_REQUESTS_KEY = "nexoralearning_registration_requests";

import type { StudentRegistrationRequest } from "../store/types";

export const getStoredRegistrationRequests = (): StudentRegistrationRequest[] => {
  const raw = localStorage.getItem(REGISTRATION_REQUESTS_KEY);
  if (raw) {
    try {
      const stored = JSON.parse(raw) as StudentRegistrationRequest[];
      if (Array.isArray(stored)) {
        return stored;
      }
    } catch {
      // ignore
    }
  }
  return [];
};

export const saveStoredRegistrationRequest = (req: StudentRegistrationRequest) => {
  const requests = getStoredRegistrationRequests();
  const filtered = requests.filter((r) => r.id !== req.id && r.email.toLowerCase() !== req.email.toLowerCase());
  const updated = [req, ...filtered];
  localStorage.setItem(REGISTRATION_REQUESTS_KEY, JSON.stringify(updated));
};

export const syncStoredRegistrationRequests = (incoming: StudentRegistrationRequest[]): StudentRegistrationRequest[] => {
  const current = getStoredRegistrationRequests();
  const map = new Map<string, StudentRegistrationRequest>();
  current.forEach((r) => {
    if (r.email) map.set(r.email.toLowerCase().trim(), r);
  });
  incoming.forEach((r) => {
    if (r.email) map.set(r.email.toLowerCase().trim(), r);
  });
  const merged = Array.from(map.values());
  localStorage.setItem(REGISTRATION_REQUESTS_KEY, JSON.stringify(merged));
  return merged;
};

export const updateStoredRegistrationRequestStatus = (
  id: string,
  status: "PENDING" | "APPROVED" | "REJECTED" | "REMOVED",
  extra?: { username?: string; generatedPassword?: string; rejectReason?: string }
): StudentRegistrationRequest | null => {
  const requests = getStoredRegistrationRequests();
  const index = requests.findIndex((r) => r.id === id);
  if (index === -1) return null;

  requests[index].status = status;
  requests[index].reviewedAt = new Date().toISOString();
  if (extra?.username) requests[index].username = extra.username;
  if (extra?.generatedPassword) requests[index].generatedPassword = extra.generatedPassword;
  if (extra?.rejectReason) requests[index].rejectReason = extra.rejectReason;

  localStorage.setItem(REGISTRATION_REQUESTS_KEY, JSON.stringify(requests));
  return requests[index];
};

export const getRegistrationRequestByEmail = (email: string): StudentRegistrationRequest | undefined => {
  const requests = getStoredRegistrationRequests();
  const normalized = email.toLowerCase().trim();
  return requests.find((r) => r.email.toLowerCase().trim() === normalized);
};

export const getPendingRegistrationRequestsCount = (): number => {
  const requests = getStoredRegistrationRequests();
  return requests.filter((r) => r.status === "PENDING").length;
};

