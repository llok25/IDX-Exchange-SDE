const MAPS_API_KEY = import.meta.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';

export default function PropertyMap({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (
    latitude === null || latitude === undefined || String(latitude).trim() === ''
    || longitude === null || longitude === undefined || String(longitude).trim() === ''
    || !Number.isFinite(lat) || !Number.isFinite(lng)
  ) {
    return null;
  }

  const location = `${lat},${lng}`;
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(MAPS_API_KEY)}&q=${encodeURIComponent(location)}&zoom=15`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;

  return (
    <section className="detail-section property-map" aria-labelledby="property-map-title">
      <div className="detail-section__heading">
        <h2 id="property-map-title">Location</h2>
        <a href={directionsUrl} target="_blank" rel="noreferrer">
          Get directions <span aria-hidden="true">↗</span>
        </a>
      </div>
      <iframe
        title="Property location on Google Maps"
        src={embedUrl}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </section>
  );
}
