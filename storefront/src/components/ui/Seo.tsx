import { Helmet } from 'react-helmet-async';
import { useT } from '../../i18n';
import { SHOP_NAME } from '../../lib/config';

export function Seo({ title, description }: { title?: string; description?: string }) {
  const t = useT();
  const full = title ? `${title} | ${SHOP_NAME}` : t('seo.default');
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
    </Helmet>
  );
}
