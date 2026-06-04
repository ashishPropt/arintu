import { useState, useEffect } from 'react';
import { publicApi } from '../api';

/**
 * Fetches site content for a given section from the CMS.
 * Falls back to `defaults` if the section is not yet seeded or if an error occurs.
 *
 * Usage:
 *   const { data, loading } = useSiteContent('history', DEFAULT_HISTORY);
 */
export function useSiteContent(section, defaults) {
  const [data, setData] = useState(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.siteContent(section)
      .then((res) => {
        const fetched = res.data;
        if (fetched && typeof fetched === 'object' && Object.keys(fetched).length > 0) {
          setData(fetched);
        }
        // else: keep defaults
      })
      .catch(() => {
        // Network error or table doesn't exist yet — keep defaults silently
      })
      .finally(() => setLoading(false));
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading };
}
