import { useState } from 'react';

function MediaCard({ item }) {
    const isVideo = item.type === 'video';
    const [showVideo, setShowVideo] = useState(false);

    const handleVideoClick = () => {
        setShowVideo(true);
    };

    return (
        <div className="media-card">
            {isVideo ? (
                showVideo ? (
                    <video
                        className="media-content"
                        src={item.url}
                        controls
                        autoPlay
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                ) : (
                    <div className="media-content video" onClick={handleVideoClick}>
                        <span className="play-icon">▶️</span>
                        <span className="click-hint">Click to play</span>
                    </div>
                )
            ) : (
                <img
                    className="media-content"
                    src={item.url}
                    alt={item.altText || 'Scraped image'}
                    loading="lazy"
                    onError={(e) => {
                        e.target.style.display = 'none';
                    }}
                />
            )}
            <div className="card-info">
                <span className={`type-badge ${item.type}`}>
                    {item.type}
                </span>
                <p className="source" title={item.sourceUrl}>
                    {item.sourceUrl}
                </p>
            </div>
        </div>
    );
}

export default MediaCard;
