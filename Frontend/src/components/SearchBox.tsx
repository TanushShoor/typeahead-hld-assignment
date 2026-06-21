import { useState, useEffect, useRef } from "react";
import "./SearchBox.css";

// Base API URL injected via Vite env (.env -> VITE_API_URL), with a local fallback.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Suggestion {
  id: number;
  query: string;
  count: number;
}

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [trending, setTrending] = useState<string[]>([]);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch Trending on mount
  useEffect(() => {
    fetch(`${API_URL}/api/v2/trending`)
      .then(res => res.json())
      .then(result => setTrending(result.data || []))
      .catch(err => console.error("Failed to load trending:", err));
  }, []);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (!query.trim()) {
      setSuggestions([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/api/v2/suggest?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Network response was not ok");
        const result = await response.json();
        setSuggestions(result.data || []);
      } catch (err) {
        console.error("Failed to fetch suggestions:", err);
        setError("Failed to fetch suggestions. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }, 300); 
    
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setQuery(searchQuery); 
    setIsFocused(false);   
    
    try {
      await fetch(`${API_URL}/api/v1/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery })
      });
    } catch (error) {
      console.error("Failed to save search:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Up and Down arrows for navigation
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (selectedIndex < suggestions.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSearch(suggestions[selectedIndex].query);
      } else {
        handleSearch(query);
      }
    }
  };

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);

  const showDropdown = isFocused && (suggestions.length > 0 || isLoading || error);

  return (
    <div className="search-container">
      <h1 className="pop-logo">TYPEAHEAD SEARCH</h1>
      
      <form style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }} onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}>
        <div className="search-wrapper">
        <div className="input-row">
          {isLoading ? (
            <div className="loader"></div>
          ) : (
            <svg className="search-icon" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
              <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
            </svg>
          )}
          <input
            type="text"
            className="search-input"
            placeholder="Type something cool..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)} 
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {showDropdown && (
          <>
            <div className="dropdown-divider"></div>
            <ul className="suggestions-dropdown">
              {error && (
                <div className="error-message">{error}</div>
              )}
              {suggestions.map((item, index) => (
                <li 
                  key={item.id} 
                  className={`suggestion-item ${index === selectedIndex ? "selected" : ""}`}
                  onClick={() => handleSearch(item.query)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="suggestion-content">
                    <div className="suggestion-left">
                      <svg className="search-icon-small" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                      </svg>
                      <span className="suggestion-text">{item.query}</span>
                    </div>
                    {item.count != null && (
                      <span className="suggestion-count">
                        {Intl.NumberFormat("en", { notation: "compact" }).format(Number(item.count))}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Trending Ticker */}
      {trending.length > 0 && (
        <div className="trending-ticker">
          <span className="trending-label">🔥 TRENDING:</span>
          {trending.map((term, i) => (
            <span key={i} className="trending-term" onClick={() => handleSearch(term)}>
              {term}
              {i < trending.length - 1 && <span className="trending-dot">•</span>}
            </span>
          ))}
        </div>
      )}

        <div className="action-buttons">
          <button type="submit" className="pop-btn">Search Now</button>
          <button type="button" className="pop-btn pop-btn-pink">Feeling Lucky!</button>
        </div>
      </form>
    </div>
  );
}
