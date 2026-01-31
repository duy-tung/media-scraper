import { useState } from 'react';

function FilterBar({ filters, onFilterChange }) {
    const [searchInput, setSearchInput] = useState(filters.search);

    const handleTypeChange = (e) => {
        onFilterChange({ ...filters, type: e.target.value });
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        onFilterChange({ ...filters, search: searchInput });
    };

    return (
        <form className="filter-bar" onSubmit={handleSearchSubmit}>
            <input
                type="text"
                placeholder="Search by URL or text..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
            />
            <select value={filters.type} onChange={handleTypeChange}>
                <option value="">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
            </select>
        </form>
    );
}

export default FilterBar;
