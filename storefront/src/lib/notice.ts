import type { Notice } from '../types';
import type { TFunction } from '../i18n';
import type { Key } from '../i18n';

// The shop's server writes each notification in English. These are the messages it can send;
// the store shows them in the customer's language. A message we do not know is shown as it came.
const KNOWN: { title: string; titleKey: Key; bodyStart: string; bodyKey: Key }[] = [
  { title: 'Order received', titleKey: 'nt.received', bodyStart: 'Thank you! We got order', bodyKey: 'nt.receivedBody' },
  { title: 'Order confirmed', titleKey: 'nt.confirmed', bodyStart: 'Order', bodyKey: 'nt.confirmedBody' },
  { title: 'Ready for pickup', titleKey: 'nt.pickup', bodyStart: 'Order', bodyKey: 'nt.pickupBody' },
  { title: 'On its way', titleKey: 'nt.onWay', bodyStart: 'Order', bodyKey: 'nt.onWayBody' },
  { title: 'Order completed', titleKey: 'nt.done', bodyStart: 'Order', bodyKey: 'nt.doneBody' },
  { title: 'Order cancelled', titleKey: 'nt.cancelled', bodyStart: 'Order', bodyKey: 'nt.cancelledBody' },
];

export function noticeText(t: TFunction, n: Notice): { title: string; body: string | null } {
  const known = KNOWN.find(k => k.title === n.title);
  if (!known) return { title: n.title, body: n.body };
  const number = n.body?.match(/CM-\d+/)?.[0];
  return { title: t(known.titleKey), body: number ? t(known.bodyKey, { n: number }) : n.body };
}
