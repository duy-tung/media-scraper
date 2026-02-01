import MediaCard from './MediaCard';

function MediaGallery({ media, onItemClick }) {
    return (
        <div className="gallery">
            {media.map((item) => (
                <MediaCard key={item.id} item={item} onItemClick={onItemClick} />
            ))}
        </div>
    );
}

export default MediaGallery;
