import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { blogs as blogsApi } from '../../api';

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    blogsApi.list()
      .then((r) => setPosts(r.data || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Arintu Blog</h1>
        <p className="text-gray-500 text-sm">
          Stories, ideas, and insights from our teachers, students, and community.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📝</div>
          <p className="text-gray-500">No posts published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((p) => (
            <Link
              key={p.id}
              to={`/blog/${p.slug}`}
              className="block bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {p.hero_image && (
                <div className="aspect-[2/1] bg-gray-100 overflow-hidden">
                  <img src={p.hero_image} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6">
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {p.tags.slice(0, 4).map((t) => (
                      <span key={t} className="text-[11px] font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <h2 className="text-xl font-bold text-gray-900 mb-1.5 leading-snug">{p.title}</h2>
                {p.subtitle && (
                  <p className="text-sm text-gray-500 mb-3">{p.subtitle}</p>
                )}
                {p.excerpt && (
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 mb-4">{p.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div>
                    {p.author_name && <span className="font-medium text-gray-600">{p.author_name}</span>}
                    {p.author_name && p.published_at && <span className="mx-1.5">·</span>}
                    {p.published_at && <span>{format(new Date(p.published_at), 'PP')}</span>}
                  </div>
                  <span className="text-brand-600 group-hover:underline">Read →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
