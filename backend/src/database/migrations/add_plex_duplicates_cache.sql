-- Migration: Add Plex Duplicates Caching Table
-- Date: 2025-08-07
-- Purpose: Store duplicate scan results for 24hr background caching

-- Create plex_duplicates table for caching scan results
CREATE TABLE IF NOT EXISTS plex_duplicates (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    group_title VARCHAR(500) NOT NULL,
    group_year INTEGER,
    items JSONB NOT NULL DEFAULT '[]',
    total_size BIGINT DEFAULT 0,
    duplicate_count INTEGER DEFAULT 0,
    quality_analysis JSONB DEFAULT '{}',
    suggestions JSONB DEFAULT '{}',
    detection_method VARCHAR(50) DEFAULT 'manual',
    library_name VARCHAR(255),
    library_type VARCHAR(50),
    last_scanned TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(service_id, group_title, group_year)
);

-- Index for fast lookups by service
CREATE INDEX IF NOT EXISTS idx_plex_duplicates_service ON plex_duplicates(service_id);

-- Index for scanning timestamps
CREATE INDEX IF NOT EXISTS idx_plex_duplicates_scanned ON plex_duplicates(last_scanned);

-- Create table for tracking last scan times per service
CREATE TABLE IF NOT EXISTS plex_scan_history (
    id SERIAL PRIMARY KEY,
    service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    scan_started TIMESTAMP DEFAULT NOW(),
    scan_completed TIMESTAMP,
    total_groups_found INTEGER DEFAULT 0,
    total_items_found INTEGER DEFAULT 0,
    scan_status VARCHAR(50) DEFAULT 'running',
    error_message TEXT,
    UNIQUE(service_id, scan_started)
);

-- Index for scan history lookups
CREATE INDEX IF NOT EXISTS idx_plex_scan_history_service ON plex_scan_history(service_id, scan_started DESC);

-- Add comment for documentation
COMMENT ON TABLE plex_duplicates IS 'Cached duplicate scan results for fast retrieval and 24hr background scanning';
COMMENT ON TABLE plex_scan_history IS 'Track duplicate scanning operations and their results';