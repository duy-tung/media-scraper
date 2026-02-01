import { useEffect, useCallback } from 'react';

function Lightbox({ item, onClose }) {
    const isVideo = item?.type === 'video';

    // Close on ESC key
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [handleKeyDown]);

    if (!item) return null;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="lightbox-overlay" onClick={handleBackdropClick}>
            <button className="lightbox-close" onClick={onClose}>
                ✕
            </button>

            <div className="lightbox-content">
                {isVideo ? (
                    <video
                        className="lightbox-media"
                        src={item.url}
                        controls
                        autoPlay
                        onError={(e) => {
                            e.target.parentElement.innerHTML = '<p class="lightbox-error">Video failed to load</p>';
                        }}
                    />
                ) : (
                    <img
                        className="lightbox-media"
                        src={item.url}
                        alt={item.altText || 'Scraped image'}
                        onError={(e) => {
                            e.target.parentElement.innerHTML = '<p class="lightbox-error">Image failed to load</p>';
                        }}
                    />
                )}
            </div>

            <div className="lightbox-info">
                <span className={`type-badge ${item.type}`}>{item.type}</span>
                <p className="lightbox-source">{item.sourceUrl}</p>
            </div>
        </div>
    );
}

export default Lightbox;
