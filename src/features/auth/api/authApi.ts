import type { CurrentUser } from "@/types";
import { MOCK_USERS } from "@/services/mocks/users.mock";


/**
 * TODO(auth): This is a MOCK implementation using a raw user object in
 * localStorage. It is NOT real authentication — anyone can edit
 * localStorage in devtools and grant themselves any role.
 *
 * Before this touches anything real, replace with token-based auth:
 *   1. Store only a JWT/session token in localStorage (or better,
 *      an httpOnly cookie set by the backend).
 *   2. getCurrentUser() should become async — call `/api/me` with the
 *      token attached, let the backend validate + return the user.
 *   3. Every protected backend endpoint must independently re-check
 *      the role server-side. Guards in this app are UX only (avoid
 *      flashing protected content) — they are NOT a security boundary.
 *
 * guards.ts / ParishLayout's loader won't need structural changes when
 * this becomes async — React Router loaders already support async fns.
 */

const STORAGE_KEY = "holyapp-mock-user";

export function getCurrentUser(): CurrentUser | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: CurrentUser | null) {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}


export async function login(email: string, password: string): Promise<CurrentUser> {
  await new Promise((r) => setTimeout(r, 300)); // simulate network

  const match = MOCK_USERS.find((u) => u.email === email && u.password === password);
  if (!match) {
    throw new Error("Invalid email or password.");
  }

  const { password: _password, ...user } = match;
  setCurrentUser(user);
  return user;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  birthday: string;
  address: string;
  email: string;
  password: string;
  parishId: string;
}

// Holds a not-yet-verified registration between "submit form" and "verify OTP"
let pendingRegistration: RegisterInput | null = null;

export async function startRegistration(input: RegisterInput): Promise<void> {
  await new Promise((r) => setTimeout(r, 300));

  const exists = MOCK_USERS.some((u) => u.email === input.email);
  if (exists) {
    throw new Error("An account with this email already exists.");
  }

  pendingRegistration = input;
  // In real life: backend sends an actual email here.
  console.info(`[mock] Verification code sent to ${input.email}: 1234`);
}

export async function verifyRegistrationCode(code: string): Promise<CurrentUser> {
  await new Promise((r) => setTimeout(r, 300));

  if (!pendingRegistration) {
    throw new Error("No pending registration found. Please register again.");
  }

  // Mock: any code "1234" succeeds. Real implementation checks server-issued code.
  if (code !== "1234") {
    throw new Error("Invalid verification code.");
  }

  const input = pendingRegistration;
  pendingRegistration = null;

  const fullName = [input.firstName, input.middleName, input.lastName]
    .filter(Boolean)
    .join(" ");

  const newUser: CurrentUser = {
    id: `u-${Date.now()}`,
    parishId: input.parishId,
    role: "parishioner",
    fullName,
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    middleName: input.middleName,
    gender: input.gender,
    birthday: input.birthday,
    address: input.address,
  };

  MOCK_USERS.push({ ...newUser, password: input.password });
  setCurrentUser(newUser);
  return newUser;
}

export function resendVerificationCode(): void {
  if (!pendingRegistration) return;
  console.info(`[mock] Resent code to ${pendingRegistration.email}: 1234`);
}

export function logout() {
  setCurrentUser(null);
}

export interface UpdateProfileInput {
  firstName: string;
  lastName: string;
  middleName?: string;
  birthday: string;
  email: string;
  address: string;
}

export async function updateProfile(input: UpdateProfileInput): Promise<CurrentUser> {
  await new Promise((r) => setTimeout(r, 400));

  const current = getCurrentUser();
  if (!current) throw new Error("Not logged in.");

  const fullName = [input.firstName, input.middleName, input.lastName].filter(Boolean).join(" ");

  const updated: CurrentUser = {
    ...current,
    firstName: input.firstName,
    lastName: input.lastName,
    middleName: input.middleName,
    birthday: input.birthday,
    email: input.email,
    address: input.address,
    fullName,
  };

  setCurrentUser(updated);
  return updated;
}

export async function sendPasswordResetEmail(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  const current = getCurrentUser();
  console.info(`[mock] Password reset link sent to ${current?.email}`);
}

export async function deleteAccount(): Promise<void> {
  await new Promise((r) => setTimeout(r, 500));
  setCurrentUser(null);
}