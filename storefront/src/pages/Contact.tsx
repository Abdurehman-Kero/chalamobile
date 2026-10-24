import { useT, type Key } from '../i18n';
import { LinkButton, buttonClass } from '../components/ui/Button';
import { Icon, type IconName } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Seo } from '../components/ui/Seo';
import { SHOP_PHONE, SHOP_PHONE_DISPLAY } from '../lib/config';

const STEPS: { icon: IconName; title: Key; text: Key }[] = [
  { icon: 'search', title: 'ct.s1t', text: 'ct.s1' },
  { icon: 'user', title: 'ct.s2t', text: 'ct.s2' },
  { icon: 'phone', title: 'ct.s3t', text: 'ct.s3' },
  { icon: 'truck', title: 'ct.s4t', text: 'ct.s4' },
];

export default function Contact() {
  const t = useT();
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6 sm:pt-6">
      <Seo title={t('ct.title')} description={t('ct.seo')} />
      <PageHeader title={t('ct.title')} fallback="/" />

      <section className="mt-5 rounded-2xl border border-line bg-surface p-5 sm:mt-6 sm:rounded-3xl sm:p-8" aria-label={t('header.callUs')}>
        <p className="text-sm text-muted">{t('ct.callOrMsg')}</p>
        <a href={`tel:${SHOP_PHONE}`} className="mt-1 block text-2xl font-bold tracking-tight text-brand-ink sm:text-4xl">{SHOP_PHONE_DISPLAY}</a>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a href={`tel:${SHOP_PHONE}`} className={buttonClass('primary', 'lg')}><Icon name="phone" size={18} /> {t('ct.callNow')}</a>
          <LinkButton to="/shop" variant="secondary" size="lg">{t('ct.browse')}</LinkButton>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-surface p-5 sm:mt-6 sm:rounded-3xl sm:p-8" aria-label={t('ct.repairsTitle')}>
        <div className="flex items-start gap-3 sm:gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-ink"><Icon name="wrench" size={22} /></span>
          <div>
            <h2 className="text-lg font-bold">{t('ct.repairsTitle')}</h2>
            <p className="mt-1 text-muted">{t('ct.repairsText')}</p>
          </div>
        </div>
      </section>

      <section className="mt-5 sm:mt-6" aria-label={t('ct.how')}>
        <h2 className="mb-3 text-lg font-bold">{t('ct.how')}</h2>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3 rounded-2xl border border-line bg-surface p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunken text-sm font-bold">{i + 1}</span>
              <div><p className="font-semibold">{t(s.title)}</p><p className="text-sm text-muted">{t(s.text)}</p></div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
