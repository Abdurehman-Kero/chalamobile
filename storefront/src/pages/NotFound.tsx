import { Link } from 'react-router-dom';
import { useT } from '../i18n';
import { buttonClass } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';

export default function NotFound() {
  const t = useT();
  return (
    <>
      <Seo title={t('nf.title')} />
      <EmptyState icon="search" title={t('nf.title')} message={t('nf.text')}
        action={<Link to="/" className={buttonClass()}>{t('nf.home')}</Link>} />
    </>
  );
}
