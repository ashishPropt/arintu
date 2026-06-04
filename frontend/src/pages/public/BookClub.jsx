import { useSiteContent } from '../../hooks/useSiteContent';

const DEFAULT_BOOK_CLUB = {
  emoji: '📚',
  title: 'Book Club — Coming Soon',
  subtitle:
    "We're putting together something special for our reading community. The Arintu Book Club will launch soon — stay tuned!",
};

export default function BookClub() {
  const { data } = useSiteContent('book_club', DEFAULT_BOOK_CLUB);

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
