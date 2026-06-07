import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_READWAVE = {
  emoji: '📖',
  title: 'Readwave — Coming Soon',
  subtitle:
    'A community wave for readers — book recommendations, group reads, and conversations ' +
    "about the books that have shaped us. Stay tuned, we're building it.",
};

export default function Readwave() {
  const { data } = useSiteContent('readwave', DEFAULT_READWAVE);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-5">{data.emoji}</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">{data.title}</h1>
        <p className="text-gray-500 text-sm leading-relaxed">{data.subtitle}</p>
      </div>
    </div>
  );
}
