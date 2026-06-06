import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import { blogs as blogsApi } from '../../api';
import Markdown from '../../components/Markdown';

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    blogsApi.bySlug(slug)
      .then((r) => setPost(r.data))
      .catch(() => setError('Post not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center text-gray-400">Loading…</div>;
  }
  if (error || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center">
        <div className="text-5xl mb-4">🤔</div>
        <p className="text-gray-700 font-semibold mb-2">Post not found</p>
        <Link to="/blog" className="text-brand-600 hover:underline text-sm">← Back to all posts</Link>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <Link to="/blog" className="text-xs text-gray-400 hover:text-brand-600 hover:underline mb-6 inline-block">
        ← All posts
      </Link>

      {/* Hero */}
      {post.hero_image && (
        <div className="aspect-[2/1] rounded-2xl bg-gray-100 overflow-hidden mb-8">
          <img src={post.hero_image} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {post.tags.map((t) => (
            <span key={t} className="text-[11px] font-medium bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-3">{post.title}</h1>
      {post.subtitle && (
        <p className="text-lg text-gray-500 mb-5 leading-snug">{post.subtitle}</p>
      )}

      {/* Author / date */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 border-b border-gray-100 pb-6 mb-6">
        {post.author_name && (
          <div>
            <span className="font-semibold text-gray-800">{post.author_name}</span>
            {post.author_role && <span className="text-gray-400"> · {post.author_role}</span>}
          </div>
        )}
        {post.author_name && post.published_at && <span className="text-gray-300">·</span>}
        {post.published_at && (
          <span>{format(new Date(post.published_at), 'PPP')}</span>
        )}
      </div>

      {/* Body */}
      <Markdown source={post.content} />

      <div className="mt-12 pt-6 border-t border-gray-100 text-center">
        <Link to="/blog" className="text-sm text-brand-600 hover:underline">← Back to all posts</Link>
      </div>
    </article>
  );
}
