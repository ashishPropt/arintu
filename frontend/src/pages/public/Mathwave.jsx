import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_MATHWAVE = {
  emoji: '🌊',
  title: 'Mathwave — Coming Soon',
  subtitle:
    'A community wave for math lovers — problem-solving sessions, collaborative challenges, ' +
    "and a place to ride the rhythm of numbers together. Stay tuned, we're building it.",
};

export default function Mathwave() {
  const { data } = useSiteContent('mathwave', DEFAULT_MATHWAVE);

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
