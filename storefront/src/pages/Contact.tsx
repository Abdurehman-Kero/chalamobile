import { LinkButton, buttonClass } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { Seo } from '../components/ui/Seo';
import { SHOP_NAME, SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'search', title: 'Pick what you like', text: 'Browse the shop and add items to your cart.' },
  { icon: 'user', title: 'Place your order', text: 'Create a free account and tell us how you want it delivered and paid.' },
  { icon: 'phone', title: 'We call to confirm', text: 'We check the details with you by phone before anything is sent.' },
  { icon: 'truck', title: 'Get it', text: 'Receive it at your door or collect it from the shop.' },
];

export default function Contact() {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:px-6">
      <Seo title="Contact and repairs" description={`Call ${SHOP_NAME} for orders, questions and phone repairs.`} />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contact and repairs</h1>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8" aria-label="Call us">
        <p className="text-sm text-muted">Call or message the shop</p>
        <a href={`tel:${SHOP_PHONE}`} className="mt-1 block text-3xl font-bold tracking-tight text-brand sm:text-4xl">{SHOP_PHONE_DISPLAY}</a>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a href={`tel:${SHOP_PHONE}`} className={buttonClass('primary', 'lg')}><Icon name="phone" size={18} /> Call now</a>
          <LinkButton to="/shop" variant="secondary" size="lg">Browse the shop</LinkButton>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-6 sm:p-8" aria-label="Repairs">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand"><Icon name="wrench" size={22} /></span>
          <div>
            <h2 className="text-lg font-bold">Phone and laptop repairs</h2>
            <p className="mt-1 text-muted">Bring your device to the shop or call us. We tell you what is wrong, what it will cost and when it will be ready, before we start.</p>
          </div>
        </div>
      </section>

      <section className="mt-6" aria-label="How ordering works">
        <h2 className="mb-3 text-lg font-bold">How ordering works</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-sm font-bold">{i + 1}</span>
              <div><p className="font-semibold">{s.title}</p><p className="text-sm text-muted">{s.text}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
