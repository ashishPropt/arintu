import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_JOBS = {
  emoji: '🚀',
  title: "We're Hiring — Soon",
  subtitle:
    "Exciting opportunities are on the way. We're building a small, passionate team committed to making quality education accessible everywhere. Check back here for open roles as we grow.",
  contact_email: 'infoenfinitty@gmail.com',
};

export default function Jobs() {
  const { data } = useSiteContent('jobs', DEFAULT_JOBS);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
      <div className="text-6xl mb-6">{data.emoji}</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">{data.title}</h1>
      <p className="text-gray-500 leading-relaxed mb-6">{data.subtitle}</p>
      <p className="text-sm text-gray-400">
        In the meantime, feel free to introduce yourself at{' '}
        <a href={`mailto:${data.contact_email}`} className="text-brand-600 hover:underline">
          {data.contact_email}
        </a>
        {' '}— we'd love to hear from you.
      </p>
    </div>
  );
}
