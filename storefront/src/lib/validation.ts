// Ethiopian mobile numbers: 0911234567, 911234567, +251911234567 (spaces and dashes allowed).
const PHONE = /^(?:\+?251|0)?[79]\d{8}$/;

export const phoneRule = {
  required: 'Enter your phone number',
  validate: (v: string) => PHONE.test(v.replace(/[\s\-()]/g, '')) || 'Enter a valid phone number, like 0911 234 567',
};

export const nameRule = {
  required: 'Enter your full name',
  validate: (v: string) => v.trim().length >= 2 || 'Enter your full name',
};

export const passwordRule = {
  required: 'Enter a password',
  minLength: { value: 6, message: 'Use at least 6 characters' },
};

export const emailRule = {
  validate: (v: string | undefined) => !v || /^\S+@\S+\.\S+$/.test(v) || 'Enter a valid email address',
};

/** A fresh key per attempt so a double tap or retry creates one order, not two. */
export function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
