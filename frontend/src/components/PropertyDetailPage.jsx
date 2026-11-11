import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchOpenHouses, fetchPropertyDetail } from '../api/client.js';
import PropertyImageGallery from './PropertyImageGallery.jsx';
import PropertyMap from './PropertyMap.jsx';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

function formatPrice(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
    ? currency.format(Number(value))
    : 'Price upon request';
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat('en-US', { dateStyle: 'full' }).format(date);
}

function formatTime(value) {
  if (!value) return 'Time unavailable';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return String(value);
  const hour = Number(match[1]);
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${match[2]} ${period}`;
}

function getOpenHouseRemarks(allData) {
  if (!allData) return '';
  try {
    const data = typeof allData === 'string' ? JSON.parse(allData) : allData;
    return typeof data?.OpenHouseRemarks === 'string' ? data.OpenHouseRemarks.trim() : '';
  } catch {
    return '';
  }
}

function PropertyDetails({ property }) {
  const details = [
    ['Property type', property.L_Type_],
    ['Class', property.L_Class],
    ['Year built', property.YearBuilt],
    ['Lot size', property.L_Keyword1],
    ['Garage spaces', property.L_Keyword5],
    ['Stories', property.StoriesTotal],
    ['Flooring', property.Flooring],
    ['View', property.ViewYN],
    ['Pool', property.PoolPrivateYN],
    ['Subdivision', property.SubdivisionName || property.LM_char10_70],
    ['Status', property.L_Status],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  return (
    <section className="detail-section" aria-labelledby="property-details-title">
      <h2 id="property-details-title">Property details</h2>
      <dl className="property-details">
        {details.map(([label, value]) => (
          <div className="property-details__item" key={label}>
            <dt>{label}</dt>
            <dd>{valueOrDash(value)}</dd>
          </div>
        ))}
      </dl>
      {details.length === 0 && <p className="detail-muted">Additional property details are unavailable.</p>}
    </section>
  );
}

function OpenHouses({ openHouses, loading, error }) {
  return (
    <section className="detail-section" aria-labelledby="open-houses-title">
      <h2 id="open-houses-title">Open houses</h2>
      {loading ? (
        <p className="detail-muted" role="status">Loading open houses…</p>
      ) : error ? (
        <p className="detail-error" role="alert">{error}</p>
      ) : openHouses.length === 0 ? (
        <p className="detail-muted">No open houses scheduled</p>
      ) : (
        <ul className="open-house-list">
          {openHouses.map((openHouse) => {
            const remarks = getOpenHouseRemarks(openHouse.all_data);
            return (
              <li className="open-house-card" key={openHouse.id || `${openHouse.OpenHouseDate}-${openHouse.OH_StartTime}`}>
                <p className="open-house-card__date">{formatDate(openHouse.OpenHouseDate)}</p>
                <p className="open-house-card__time">
                  {formatTime(openHouse.OH_StartTime)} – {formatTime(openHouse.OH_EndTime)}
                </p>
                {remarks && <p className="open-house-card__remarks">{remarks}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [openHouses, setOpenHouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openHousesLoading, setOpenHousesLoading] = useState(true);
  const [error, setError] = useState('');
  const [openHousesError, setOpenHousesError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setProperty(null);
    setOpenHouses([]);
    setLoading(true);
    setOpenHousesLoading(true);
    setError('');
    setOpenHousesError('');

    fetchPropertyDetail(id, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return;
      setProperty(result);
      setLoading(false);
      return fetchOpenHouses(id, { signal: controller.signal }).then((resultHouses) => {
        if (!controller.signal.aborted) setOpenHouses(Array.isArray(resultHouses) ? resultHouses : []);
      }).catch((requestError) => {
        if (!controller.signal.aborted) {
          setOpenHousesError(requestError.message || 'Open houses could not be loaded.');
        }
      }).finally(() => {
        if (!controller.signal.aborted) setOpenHousesLoading(false);
      });
    }).catch((requestError) => {
      if (!controller.signal.aborted) {
        setError(requestError.message || 'Property details could not be loaded.');
        setLoading(false);
        setOpenHousesLoading(false);
      }
    });

    return () => controller.abort();
  }, [id]);

  const address = property?.L_Address || 'Property details';
  const location = [property?.L_City, property?.L_State, property?.L_Zip].filter(Boolean).join(', ');
  const squareFeet = property?.LM_Int2_3 !== null
    && property?.LM_Int2_3 !== undefined
    && property?.LM_Int2_3 !== ''
    && Number.isFinite(Number(property.LM_Int2_3))
    ? Number(property.LM_Int2_3).toLocaleString('en-US')
    : '—';

  return (
    <main className="page-shell">
      <header className="site-header">
        <Link className="brand" to="/" aria-label="IDX Exchange home">
          <span className="brand__symbol" aria-hidden="true">i</span>
          <span>IDX<span className="brand__light">exchange</span></span>
        </Link>
        <div className="header-note">
          <span className="status-dot" aria-hidden="true" />
          California properties
        </div>
      </header>

      <div className="property-detail">
        <Link className="detail-back-link" to="/">← Back to listings</Link>
        {loading ? (
          <div className="state-panel" role="status">
            <span className="spinner" aria-hidden="true" />
            <p>Loading property details…</p>
          </div>
        ) : error ? (
          <div className="state-panel state-panel--error" role="alert">
            <span className="state-panel__icon" aria-hidden="true">!</span>
            <h1>Property unavailable</h1>
            <p>{error}</p>
          </div>
        ) : property ? (
          <>
            <section className="property-detail__hero">
              <PropertyImageGallery photos={property.L_Photos} address={address} />
              <div className="property-detail__summary">
                <p className="eyebrow">{property.L_Type_ || property.L_Class || 'Property for sale'}</p>
                <h1>{address}</h1>
                <p className="property-detail__location">{location || 'Location unavailable'}</p>
                <p className="property-detail__price">{formatPrice(property.L_SystemPrice)}</p>
                <div className="property-detail__stats" aria-label="Property statistics">
                  <span><strong>{valueOrDash(property.L_Keyword2)}</strong> beds</span>
                  <span><strong>{valueOrDash(property.LM_Dec_3)}</strong> baths</span>
                  <span><strong>{squareFeet}</strong> sqft</span>
                  <span><strong>{valueOrDash(property.YearBuilt)}</strong> year built</span>
                </div>
                {property.L_DisplayId && (
                  <p className="property-detail__listing-id">Listing ID {property.L_DisplayId}</p>
                )}
              </div>
            </section>

            <div className="property-detail__content">
              <div className="property-detail__main-column">
                <section className="detail-section" aria-labelledby="description-title">
                  <h2 id="description-title">About this home</h2>
                  <p className="property-description">
                    {property.L_Remarks || 'No description is available for this property.'}
                  </p>
                </section>
                <PropertyDetails property={property} />
                <OpenHouses
                  openHouses={openHouses}
                  loading={openHousesLoading}
                  error={openHousesError}
                />
              </div>
              <PropertyMap
                latitude={property.LMD_MP_Latitude}
                longitude={property.LMD_MP_Longitude}
              />
            </div>
          </>
        ) : null}
      </div>
      <footer className="site-footer">
        <span>IDX Exchange</span>
        <span>Homes for the next chapter.</span>
      </footer>
    </main>
  );
}
