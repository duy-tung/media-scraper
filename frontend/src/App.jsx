import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import MediaGallery from './components/MediaGallery';
import FilterBar from './components/FilterBar';
import Pagination from './components/Pagination';
import Lightbox from './components/Lightbox';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
    const [media, setMedia] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0
    });
    const [filters, setFilters] = useState({
        type: '',
        search: ''
    });

    const fetchMedia = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...(filters.type && { type: filters.type }),
                ...(filters.search && { search: filters.search })
            });

            const response = await axios.get(`${API_URL}/api/media?${params}`);
            setMedia(response.data.data);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination.total,
                totalPages: response.data.pagination.totalPages
            }));
        } catch (error) {
            console.error('Error fetching media:', error);
        } finally {
            setLoading(false);
        }
    }, [pagination.page, pagination.limit, filters.type, filters.search]);

    useEffect(() => {
        fetchMedia();
    }, [fetchMedia]);

    const handleFilterChange = (newFilters) => {
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (page) => {
        setPagination(prev => ({ ...prev, page }));
    };

    const handleItemClick = (item) => {
        setSelectedItem(item);
    };

    const handleCloseLightbox = () => {
        setSelectedItem(null);
    };

    return (
        <div className="app">
            <header className="header">
                <h1>Media Scraper</h1>
                <p>Browse scraped images and videos</p>
            </header>

            <div className="stats">
                <div className="stat">
                    <div className="value">{pagination.total.toLocaleString()}</div>
                    <div className="label">Total Media</div>
                </div>
            </div>

            <FilterBar filters={filters} onFilterChange={handleFilterChange} />

            {loading ? (
                <div className="loading">Loading media</div>
            ) : media.length === 0 ? (
                <div className="empty">No media found. Try adjusting your filters.</div>
            ) : (
                <>
                    <MediaGallery media={media} onItemClick={handleItemClick} />
                    <Pagination
                        currentPage={pagination.page}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                    />
                </>
            )}

            {selectedItem && (
                <Lightbox item={selectedItem} onClose={handleCloseLightbox} />
            )}
        </div>
    );
}

export default App;
