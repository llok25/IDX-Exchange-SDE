import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProperties } from '../api/client.js';
import PropertyCard from './PropertyCard.jsx';
import PropertyFilters, { EMPTY_FILTERS } from './PropertyFilters.js';

const PAGE_SIZE = 20;

function nonEmptyFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters)
      .map(([name, value]) => [name, typeof value === 'string' ? value.trim() : value])
      .filter(([, value]) => value !== ''),
  );
}

export default function ListingsPage() {
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState({});
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState('');
  const loadMoreInFlight = useRef(false);
  const loadMoreController = useRef(null);
  const searchController = useRef(null);
  const searchRequestId = useRef(0);
  const loadMoreSentinel = useRef(null);

  const refreshListings = useCallback(async (nextFilters) => {
    const requestFilters = nonEmptyFilters(nextFilters);
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    const controller = new AbortController();
    searchController.current?.abort();
    searchController.current = controller;
    loadMoreController.current?.abort();
    loadMoreController.current = null;
    loadMoreInFlight.current = false;
    setLoadingMore(false);
    setLoadMoreError('');
    setListings([]);
    setTotal(0);
    setAppliedFilters(requestFilters);
    setLoading(true);
    setError('');

    try {
      const data = await fetchProperties(
        { ...requestFilters, limit: PAGE_SIZE, offset: 0 },
        { signal: controller.signal },
      );
      if (searchRequestId.current === requestId && !controller.signal.aborted) {
        setListings(data.results);
        setTotal(data.total);
      }
    } catch (requestError) {
      if (!controller.signal.aborted && searchRequestId.current === requestId) {
        setError(requestError.message || 'Listings could not be loaded.');
      }
    } finally {
      if (!controller.signal.aborted && searchRequestId.current === requestId) {
        setLoading(false);
        searchController.current = null;
      }
    }
  }, []);

  useEffect(() => {
    refreshListings({});
    return () => {
      searchController.current?.abort();
      loadMoreController.current?.abort();
    };
  }, [refreshListings]);

  const loadNextPage = useCallback(async () => {
    if (loadMoreInFlight.current || listings.length >= total) return;

    loadMoreInFlight.current = true;
    const controller = new AbortController();
    loadMoreController.current = controller;
    setLoadingMore(true);
    setLoadMoreError('');

    try {
      const data = await fetchProperties(
        { ...appliedFilters, limit: PAGE_SIZE, offset: listings.length },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
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
      if (loadMoreController.current === controller) {
        loadMoreInFlight.current = false;
        loadMoreController.current = null;
        setLoadingMore(false);
      }
    }
  }, [appliedFilters, listings.length, total]);

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

        <PropertyFilters
          filters={filters}
          onChange={setFilters}
          onSearch={refreshListings}
          onClear={() => {
            setFilters(EMPTY_FILTERS);
            refreshListings(EMPTY_FILTERS);
          }}
        />

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
            <p>Try adjusting your filters or clear them to see all available properties.</p>
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
