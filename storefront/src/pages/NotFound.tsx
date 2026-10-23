import { Link } from 'react-router-dom';
import { buttonClass } from '../components/ui/Button';
import { EmptyState } from '../components/ui/States';
import { Seo } from '../components/ui/Seo';

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" />
      <EmptyState icon="search" title="We can't find that page" message="The link may be old or mistyped."
        action={<Link to="/" className={buttonClass()}>Go to the home page</Link>} />
    </>
  );
}
