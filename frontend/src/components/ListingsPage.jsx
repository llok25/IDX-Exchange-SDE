import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProperties } from '../api/client.js';
import PropertyCard from './PropertyCard.jsx';
import PropertyFilters, { EMPTY_FILTERS } from './PropertyFilters.js';
import Pagination from './Pagination.js';

const DEFAULT_ITEMS_PER_PAGE = 20;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const searchController = useRef(null);
  const searchRequestId = useRef(0);

  const refreshListings = useCallback((nextFilters) => {
    setCurrentPage(1);
    setAppliedFilters(nonEmptyFilters(nextFilters));
  }, []);

  useEffect(() => {
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;
    const controller = new AbortController();
    searchController.current?.abort();
    searchController.current = controller;
    setListings([]);
    setTotal(0);
    setLoading(true);
    setError('');

    fetchProperties(
      {
        ...appliedFilters,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage,
      },
      { signal: controller.signal },
    ).then((data) => {
      if (searchRequestId.current === requestId && !controller.signal.aborted) {
        setListings(data.results);
        setTotal(data.total);
      }
    }).catch((requestError) => {
      if (!controller.signal.aborted && searchRequestId.current === requestId) {
        setError(requestError.message || 'Listings could not be loaded.');
      }
    }).finally(() => {
      if (!controller.signal.aborted && searchRequestId.current === requestId) {
        setLoading(false);
        searchController.current = null;
      }
    });

    return () => {
      controller.abort();
      if (searchController.current === controller) {
        searchController.current = null;
      }
    };
  }, [appliedFilters, currentPage, itemsPerPage]);

  const changePage = useCallback((page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  }, []);

  const totalPages = Math.ceil(total / itemsPerPage);
  const firstResult = total === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const lastResult = Math.min(currentPage * itemsPerPage, total);

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
                : `Showing ${firstResult.toLocaleString('en-US')}-${lastResult.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} properties`}
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
          <>
            <div className="property-grid">
              {listings.map((property) => (
                <PropertyCard
                  key={`${property.L_ListingID || 'listing'}-${property.id}`}
                  property={property}
                />
              ))}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={changePage}
            />
          </>
        )}
      </section>

      <footer className="site-footer">
        <span>IDX Exchange</span>
        <span>Homes for the next chapter.</span>
      </footer>
    </main>
  );
}
