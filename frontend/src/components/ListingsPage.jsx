import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProperties } from '../api/client.js';
import PropertyCard from './PropertyCard.jsx';

const PAGE_SIZE = 20;

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const loadMoreInFlight = useRef(false);
  const loadMoreController = useRef(null);
  const loadMoreSentinel = useRef(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadListings() {
      setLoading(true);
      setError('');
      try {
        const data = await fetchProperties(
          { limit: PAGE_SIZE, offset: 0 },
          { signal: controller.signal },
        );
        setListings(data.results);
        setTotal(data.total);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message || 'Listings could not be loaded.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadListings();
    return () => {
      controller.abort();
      loadMoreController.current?.abort();
    };
  }, []);

  const loadNextPage = useCallback(async () => {
    if (loadMoreInFlight.current || listings.length >= total) return;

    loadMoreInFlight.current = true;
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setLoadMoreError('');

    try {
      const data = await fetchProperties(
        { limit: PAGE_SIZE, offset: listings.length },
        { signal: controller.signal },
      );
      if (data.results.length === 0) {
        setLoadMoreError('No additional properties were returned. Please try again.');
        return;
      }
      setListings((currentListings) => [...currentListings, ...data.results]);
      setTotal(data.total);
    } catch (requestError) {
      if (!controller.signal.aborted) {
        setLoadMoreError(requestError.message || 'More properties could not be loaded.');
      }
    } finally {
      if (!controller.signal.aborted) {
        loadMoreInFlight.current = false;
        loadMoreController.current = null;
        setLoadingMore(false);
      }
    }
  }, [listings.length, total]);

  const hasMore = listings.length < total;

  useEffect(() => {
    if (!hasMore || loading || loadingMore || loadMoreError || !loadMoreSentinel.current) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) loadNextPage();
    }, { rootMargin: '300px' });
    observer.observe(loadMoreSentinel.current);

    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadMoreError, loadNextPage]);

  return (
    <main className="page-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="IDX Exchange home">
          <span className="brand__symbol" aria-hidden="true">i</span>
          <span>IDX<span className="brand__light">exchange</span></span>
        </a>
        <div className="header-note">
          <span className="status-dot" aria-hidden="true" />
          California properties
        </div>
      </header>

      <section className="listings">
        <div className="listings__intro">
          <p className="eyebrow">Find your place</p>
          <h1>Homes worth<br className="mobile-break" /> coming home to.</h1>
          <p className="listings__subtitle">
            Explore homes for sale and find a space that feels like yours.
          </p>
        </div>

        <div className="listings__toolbar">
          <div>
            <h2>Featured listings</h2>
            <p className="listings__count" aria-live="polite">
              {loading
                ? 'Loading properties…'
                : `Showing ${Math.min(listings.length, total).toLocaleString('en-US')} of ${total.toLocaleString('en-US')} properties`}
            </p>
          </div>
          <span className="toolbar-label">Latest listings</span>
        </div>

        {loading ? (
          <div className="state-panel" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Finding homes for you…</p>
          </div>
        ) : error ? (
          <div className="state-panel state-panel--error" role="alert">
            <span className="state-panel__icon" aria-hidden="true">!</span>
            <h2>We couldn’t load the listings</h2>
            <p>{error}</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="state-panel">
            <h2>No properties found</h2>
            <p>Please check back soon for new listings.</p>
          </div>
        ) : (
          <div className="property-grid">
            {listings.map((property) => (
              <PropertyCard
                key={`${property.L_ListingID || 'listing'}-${property.id}`}
                property={property}
              />
            ))}
          </div>
        )}
        {!loading && !error && hasMore && (
          <div className="listings__pagination" ref={loadMoreSentinel}>
            {loadMoreError && (
              <p className="listings__pagination-error" role="alert">{loadMoreError}</p>
            )}
            <button
              className="load-more-button"
              type="button"
              onClick={loadNextPage}
              disabled={loadingMore}
            >
              {loadingMore
                ? 'Loading properties…'
                : loadMoreError
                  ? 'Retry loading properties'
                  : `Show next ${Math.min(PAGE_SIZE, total - listings.length)} properties`}
            </button>
          </div>
        )}
      </section>

      <footer className="site-footer">
        <span>IDX Exchange</span>
        <span>Homes for the next chapter.</span>
      </footer>
    </main>
  );
}
