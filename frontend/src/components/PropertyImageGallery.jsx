import { useEffect, useRef, useState } from 'react';
import { getPhotos } from '../utils/photos.js';

export default function PropertyImageGallery({ photos: photoData, address }) {
  const photos = getPhotos(photoData);
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const thumbnailRefs = useRef([]);
  const lightboxRef = useRef(null);

  useEffect(() => {
    thumbnailRefs.current[activeIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeIndex]);

  useEffect(() => {
    if (lightboxOpen) lightboxRef.current?.focus();
  }, [lightboxOpen]);

  function changePhoto(offset) {
    setActiveIndex((index) => (index + offset + photos.length) % photos.length);
  }

  function handleLightboxKeyDown(event) {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setLightboxOpen(false);
    } else if (event.key === 'ArrowLeft') {
      event.stopPropagation();
      changePhoto(-1);
    } else if (event.key === 'ArrowRight') {
      event.stopPropagation();
      changePhoto(1);
    }
  }

  if (photos.length === 0) {
    return (
      <div className="property-gallery__empty">
        <span className="placeholder-mark" aria-hidden="true">⌂</span>
        <span>No photos available</span>
      </div>
    );
  }

  return (
    <div className="property-gallery">
      <button
        className="property-gallery__main"
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label="Open photo in full-screen lightbox"
      >
        <img src={photos[activeIndex]} alt={`${address || 'Property'} photo ${activeIndex + 1}`} />
        {photos.length > 1 && (
          <span className="property-gallery__counter">{activeIndex + 1} / {photos.length}</span>
        )}
      </button>
      {photos.length > 1 && (
        <div className="property-gallery__thumbnails" aria-label="Choose a property photo">
          {photos.map((photo, index) => (
            <button
              className={`property-gallery__thumbnail${index === activeIndex ? ' is-active' : ''}`}
              key={`${photo}-${index}`}
              type="button"
              ref={(element) => { thumbnailRefs.current[index] = element; }}
              aria-label={`Show photo ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => setActiveIndex(index)}
            >
              <img src={photo} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightboxOpen && (
        <div
          className="property-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Property photo gallery"
          tabIndex={0}
          ref={lightboxRef}
          onClick={() => setLightboxOpen(false)}
          onKeyDown={handleLightboxKeyDown}
        >
          <button
            className="property-lightbox__close"
            type="button"
            aria-label="Close photo gallery"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>
          {photos.length > 1 && (
            <button
              className="property-lightbox__arrow property-lightbox__arrow--previous"
              type="button"
              aria-label="Previous photo"
              onClick={(event) => {
                event.stopPropagation();
                changePhoto(-1);
              }}
            >
              ‹
            </button>
          )}
          <img
            className="property-lightbox__image"
            src={photos[activeIndex]}
            alt={`${address || 'Property'} photo ${activeIndex + 1} of ${photos.length}`}
            onClick={(event) => event.stopPropagation()}
          />
          {photos.length > 1 && (
            <button
              className="property-lightbox__arrow property-lightbox__arrow--next"
              type="button"
              aria-label="Next photo"
              onClick={(event) => {
                event.stopPropagation();
                changePhoto(1);
              }}
            >
              ›
            </button>
          )}
          <span className="property-lightbox__counter">{activeIndex + 1} / {photos.length}</span>
        </div>
      )}
    </div>
  );
}
