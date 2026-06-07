import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_WRITEWAVE = {
  emoji: '✍️',
  title: 'Writewave — Coming Soon',
  subtitle:
    'A community wave for writers — workshops, peer feedback, and a space to share original ' +
    "creative work. Stay tuned, we're building it.",
};

export default function Writewave() {
  const { data } = useSiteContent('writewave', DEFAULT_WRITEWAVE);

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
