import { useState } from 'react';
import { getPhotos } from '../utils/photos.js';

export default function PropertyImageCarousel({ photos: photoData, address }) {
  const photos = getPhotos(photoData);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedPhotos, setFailedPhotos] = useState(() => new Set());

  function showPhoto(event, offset) {
    event.stopPropagation();
    setActiveIndex((index) => (index + offset + photos.length) % photos.length);
  }

  function stopCardKeyboardNavigation(event) {
    event.stopPropagation();
  }

  const hasPhotos = photos.length > 0;
  const imageFailed = failedPhotos.has(activeIndex);

  return (
    <div className="image-carousel" aria-label="Property photos">
      {hasPhotos && !imageFailed ? (
        <img
          className="property-card__photo"
          src={photos[activeIndex]}
          alt={`Home at ${address || 'this listing'}${photos.length > 1 ? `, photo ${activeIndex + 1}` : ''}`}
          loading="lazy"
          onError={() => {
            setFailedPhotos((failed) => new Set(failed).add(activeIndex));
          }}
        />
      ) : (
        <div className="property-card__photo-placeholder">
          <span className="placeholder-mark" aria-hidden="true">⌂</span>
          <span>No photo available</span>
        </div>
      )}

      {photos.length > 1 && (
        <>
          <button
            className="image-carousel__arrow image-carousel__arrow--previous"
            type="button"
            aria-label="Previous photo"
            onClick={(event) => showPhoto(event, -1)}
            onKeyDown={stopCardKeyboardNavigation}
          >
            ‹
          </button>
          <button
            className="image-carousel__arrow image-carousel__arrow--next"
            type="button"
            aria-label="Next photo"
            onClick={(event) => showPhoto(event, 1)}
            onKeyDown={stopCardKeyboardNavigation}
          >
            ›
          </button>
        </>
      )}
      {hasPhotos && (
        <span className="image-carousel__counter" aria-live="polite">
          {activeIndex + 1} / {photos.length}
        </span>
      )}
    </div>
  );
}
