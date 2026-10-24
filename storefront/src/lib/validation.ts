import type { TFunction } from '../i18n';

// Ethiopian mobile numbers: 0911234567, 911234567, +251911234567 (spaces and dashes allowed).
const PHONE = /^(?:\+?251|0)?[79]\d{8}$/;

// The messages are written in the language the customer chose, so each rule is built with `t`.
export const phoneRule = (t: TFunction) => ({
  required: t('v.phoneReq'),
  validate: (v: string) => PHONE.test(v.replace(/[\s\-()]/g, '')) || t('v.phoneBad'),
});

export const nameRule = (t: TFunction) => ({
  required: t('v.nameReq'),
  validate: (v: string) => v.trim().length >= 2 || t('v.nameReq'),
});

export const passwordRule = (t: TFunction) => ({
  required: t('v.passReq'),
  minLength: { value: 6, message: t('v.passMin') },
});

export const emailRule = (t: TFunction) => ({
  validate: (v: string | undefined) => !v || /^\S+@\S+\.\S+$/.test(v) || t('v.emailBad'),
});

/** A fresh key per attempt so a double tap or retry creates one order, not two. */
export function newKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}
