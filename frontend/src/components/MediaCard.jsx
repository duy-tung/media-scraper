function MediaCard({ item }) {
    const isVideo = item.type === 'video';

    return (
        <div className="media-card">
            {isVideo ? (
                <div className="media-content video">
                    <span className="play-icon">▶️</span>
                </div>
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
