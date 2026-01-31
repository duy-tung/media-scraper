import MediaCard from './MediaCard';

function MediaGallery({ media }) {
    return (
        <div className="gallery">
            {media.map((item) => (
                <MediaCard key={item.id} item={item} />
            ))}
        </div>
    );
}

export default MediaGallery;
