import { useNavigate } from 'react-router-dom';
import PropertyImageCarousel from './PropertyImageCarousel.jsx';

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function displayValue(value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

export default function PropertyCard({ property }) {
  const navigate = useNavigate();
  const listingId = property.L_ListingID || property.id;
  const hasPrice = property.L_SystemPrice !== null
    && property.L_SystemPrice !== undefined
    && property.L_SystemPrice !== ''
    && Number.isFinite(Number(property.L_SystemPrice));
  const hasSquareFeet = property.LM_Int2_3 !== null
    && property.LM_Int2_3 !== undefined
    && property.LM_Int2_3 !== ''
    && Number.isFinite(Number(property.LM_Int2_3));

  return (
    <article
      className="property-card"
      role="link"
      tabIndex={0}
      aria-label={`View property at ${property.L_Address || 'this listing'}`}
      onClick={() => navigate(`/property/${encodeURIComponent(listingId)}`)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/property/${encodeURIComponent(listingId)}`);
        }
      }}
    >
      <div className="property-card__photo-wrap">
        <PropertyImageCarousel photos={property.L_Photos} address={property.L_Address} />
        <span className="property-card__badge">For sale</span>
      </div>

      <div className="property-card__content">
        <p className="property-card__price">
          {hasPrice ? currency.format(Number(property.L_SystemPrice)) : 'Price upon request'}
        </p>
        <h2 className="property-card__address">{displayValue(property.L_Address)}</h2>
        <p className="property-card__location">
          {[property.L_City, property.L_State].filter(Boolean).join(', ') || 'Location unavailable'}
        </p>
        <div className="property-card__details" aria-label="Property details">
          <span><strong>{displayValue(property.L_Keyword2)}</strong> beds</span>
          <span><strong>{displayValue(property.LM_Dec_3)}</strong> baths</span>
          <span>
            <strong>
              {hasSquareFeet
                ? Number(property.LM_Int2_3).toLocaleString('en-US')
                : '—'}
            </strong>{' '}
            sqft
          </span>
        </div>
      </div>
    </article>
  );
}
