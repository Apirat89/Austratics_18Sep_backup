-- =============================================================================
-- HYBRID SEARCH INFRASTRUCTURE FOR FAQ AND REGULATORY SYSTEMS
-- =============================================================================
-- Adds full-text search capabilities alongside existing vector search
-- Combines semantic (vector) + lexical (tsvector) search for improved recall

-- =============================================================================
-- 1. ADD TSVECTOR COLUMNS AND INDEXES
-- =============================================================================

-- Add tsvector column to FAQ document chunks
ALTER TABLE faq_document_chunks 
ADD COLUMN IF NOT EXISTS ts tsvector;

-- Add tsvector column to regulatory document chunks  
ALTER TABLE document_chunks 
ADD COLUMN IF NOT EXISTS ts tsvector;

-- Update existing FAQ records with tsvector data
UPDATE faq_document_chunks 
SET ts = to_tsvector('english', 
    coalesce(section_title, '') || ' ' || 
    coalesce(content, '') || ' ' ||
    coalesce(guide_category, '') || ' ' ||
    coalesce(section_category, '')
);

-- Update existing regulatory records with tsvector data
UPDATE document_chunks 
SET ts = to_tsvector('english', 
    coalesce(section_title, '') || ' ' || 
    coalesce(content, '') || ' ' ||
    coalesce(document_name, '')
);

-- Create GIN indexes for fast full-text search
CREATE INDEX IF NOT EXISTS faq_chunks_fts_idx 
ON faq_document_chunks USING GIN(ts);

CREATE INDEX IF NOT EXISTS doc_chunks_fts_idx 
ON document_chunks USING GIN(ts);

-- =============================================================================
-- 2. HYBRID SEARCH RPC FUNCTIONS
-- =============================================================================

-- FAQ Hybrid Search Function
CREATE OR REPLACE FUNCTION match_faq_documents_hybrid(
    query_embedding vector(768),
    lex_query text,
    match_count int DEFAULT 20,
    semantic_weight float DEFAULT 0.7,
    lexical_weight float DEFAULT 0.3
) RETURNS TABLE(
    id bigint,
    document_name text,
    document_type text,
    section_title text,
    content text,
    page_number int,
    chunk_index int,
    guide_category text,
    section_category text,
    similarity float4,
    lex_rank real,
    hybrid_score float4
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            fdc.id,
            fdc.document_name,
            fdc.document_type,
            fdc.section_title,
            fdc.content,
            fdc.page_number,
            fdc.chunk_index,
            fdc.guide_category,
            fdc.section_category,
            1 - (fdc.embedding <=> query_embedding) as sim_score,
            0.0::real as lex_score
        FROM faq_document_chunks fdc
        ORDER BY fdc.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    lexical_results AS (
        SELECT 
            fdc.id,
            fdc.document_name,
            fdc.document_type,
            fdc.section_title,
            fdc.content,
            fdc.page_number,
            fdc.chunk_index,
            fdc.guide_category,
            fdc.section_category,
            0.0::float4 as sim_score,
            ts_rank_cd(fdc.ts, plainto_tsquery('english', lex_query)) as lex_score
        FROM faq_document_chunks fdc
        WHERE fdc.ts @@ plainto_tsquery('english', lex_query)
        ORDER BY lex_score DESC
        LIMIT match_count * 3
    ),
    combined_results AS (
        SELECT DISTINCT ON (v.id)
            v.id,
            v.document_name,
            v.document_type,
            v.section_title,
            v.content,
            v.page_number,
            v.chunk_index,
            v.guide_category,
            v.section_category,
            v.sim_score,
            COALESCE(l.lex_score, 0.0) as lex_score
        FROM vector_results v
        LEFT JOIN lexical_results l ON l.id = v.id
        
        UNION
        
        SELECT DISTINCT ON (l.id)
            l.id,
            l.document_name,
            l.document_type,
            l.section_title,
            l.content,
            l.page_number,
            l.chunk_index,
            l.guide_category,
            l.section_category,
            COALESCE(v.sim_score, 0.0) as sim_score,
            l.lex_score
        FROM lexical_results l
        LEFT JOIN vector_results v ON v.id = l.id
        WHERE v.id IS NULL
    )
    SELECT 
        cr.id,
        cr.document_name,
        cr.document_type,
        cr.section_title,
        cr.content,
        cr.page_number,
        cr.chunk_index,
        cr.guide_category,
        cr.section_category,
        cr.sim_score,
        cr.lex_score,
        (semantic_weight * cr.sim_score + lexical_weight * cr.lex_score) as hybrid_score
    FROM combined_results cr
    ORDER BY hybrid_score DESC
    LIMIT match_count;
END $$;

-- FAQ Hybrid Search by Category Function
CREATE OR REPLACE FUNCTION match_faq_documents_hybrid_by_category(
    query_embedding vector(768),
    lex_query text,
    filter_guide_category text,
    match_count int DEFAULT 20,
    semantic_weight float DEFAULT 0.7,
    lexical_weight float DEFAULT 0.3
) RETURNS TABLE(
    id bigint,
    document_name text,
    document_type text,
    section_title text,
    content text,
    page_number int,
    chunk_index int,
    guide_category text,
    section_category text,
    similarity float4,
    lex_rank real,
    hybrid_score float4
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            fdc.id,
            fdc.document_name,
            fdc.document_type,
            fdc.section_title,
            fdc.content,
            fdc.page_number,
            fdc.chunk_index,
            fdc.guide_category,
            fdc.section_category,
            1 - (fdc.embedding <=> query_embedding) as sim_score,
            0.0::real as lex_score
        FROM faq_document_chunks fdc
        WHERE fdc.guide_category = filter_guide_category
        ORDER BY fdc.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    lexical_results AS (
        SELECT 
            fdc.id,
            fdc.document_name,
            fdc.document_type,
            fdc.section_title,
            fdc.content,
            fdc.page_number,
            fdc.chunk_index,
            fdc.guide_category,
            fdc.section_category,
            0.0::float4 as sim_score,
            ts_rank_cd(fdc.ts, plainto_tsquery('english', lex_query)) as lex_score
        FROM faq_document_chunks fdc
        WHERE fdc.guide_category = filter_guide_category
        AND fdc.ts @@ plainto_tsquery('english', lex_query)
        ORDER BY lex_score DESC
        LIMIT match_count * 3
    ),
    combined_results AS (
        SELECT DISTINCT ON (v.id)
            v.id,
            v.document_name,
            v.document_type,
            v.section_title,
            v.content,
            v.page_number,
            v.chunk_index,
            v.guide_category,
            v.section_category,
            v.sim_score,
            COALESCE(l.lex_score, 0.0) as lex_score
        FROM vector_results v
        LEFT JOIN lexical_results l ON l.id = v.id
        
        UNION
        
        SELECT DISTINCT ON (l.id)
            l.id,
            l.document_name,
            l.document_type,
            l.section_title,
            l.content,
            l.page_number,
            l.chunk_index,
            l.guide_category,
            l.section_category,
            COALESCE(v.sim_score, 0.0) as sim_score,
            l.lex_score
        FROM lexical_results l
        LEFT JOIN vector_results v ON v.id = l.id
        WHERE v.id IS NULL
    )
    SELECT 
        cr.id,
        cr.document_name,
        cr.document_type,
        cr.section_title,
        cr.content,
        cr.page_number,
        cr.chunk_index,
        cr.guide_category,
        cr.section_category,
        cr.sim_score,
        cr.lex_score,
        (semantic_weight * cr.sim_score + lexical_weight * cr.lex_score) as hybrid_score
    FROM combined_results cr
    ORDER BY hybrid_score DESC
    LIMIT match_count;
END $$;

-- Regulatory Hybrid Search Function  
CREATE OR REPLACE FUNCTION match_documents_hybrid(
    query_embedding vector(768),
    lex_query text,
    match_count int DEFAULT 20,
    semantic_weight float DEFAULT 0.7,
    lexical_weight float DEFAULT 0.3
) RETURNS TABLE(
    id bigint,
    document_name text,
    section_title text,
    content text,
    page_number int,
    chunk_index int,
    similarity float4,
    lex_rank real,
    hybrid_score float4
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    WITH vector_results AS (
        SELECT 
            dc.id,
            dc.document_name,
            dc.section_title,
            dc.content,
            dc.page_number,
            dc.chunk_index,
            1 - (dc.embedding <=> query_embedding) as sim_score,
            0.0::real as lex_score
        FROM document_chunks dc
        ORDER BY dc.embedding <=> query_embedding
        LIMIT match_count * 3
    ),
    lexical_results AS (
        SELECT 
            dc.id,
            dc.document_name,
            dc.section_title,
            dc.content,
            dc.page_number,
            dc.chunk_index,
            0.0::float4 as sim_score,
            ts_rank_cd(dc.ts, plainto_tsquery('english', lex_query)) as lex_score
        FROM document_chunks dc
        WHERE dc.ts @@ plainto_tsquery('english', lex_query)
        ORDER BY lex_score DESC
        LIMIT match_count * 3
    ),
    combined_results AS (
        SELECT DISTINCT ON (v.id)
            v.id,
            v.document_name,
            v.section_title,
            v.content,
            v.page_number,
            v.chunk_index,
            v.sim_score,
            COALESCE(l.lex_score, 0.0) as lex_score
        FROM vector_results v
        LEFT JOIN lexical_results l ON l.id = v.id
        
        UNION
        
        SELECT DISTINCT ON (l.id)
            l.id,
            l.document_name,
            l.section_title,
            l.content,
            l.page_number,
            l.chunk_index,
            COALESCE(v.sim_score, 0.0) as sim_score,
            l.lex_score
        FROM lexical_results l
        LEFT JOIN vector_results v ON v.id = l.id
        WHERE v.id IS NULL
    )
    SELECT 
        cr.id,
        cr.document_name,
        cr.section_title,
        cr.content,
        cr.page_number,
        cr.chunk_index,
        cr.sim_score,
        cr.lex_score,
        (semantic_weight * cr.sim_score + lexical_weight * cr.lex_score) as hybrid_score
    FROM combined_results cr
    ORDER BY hybrid_score DESC
    LIMIT match_count;
END $$;

-- =============================================================================
-- 3. UPDATE TRIGGERS FOR AUTOMATIC TSVECTOR UPDATES
-- =============================================================================

-- Function to update tsvector for FAQ documents
CREATE OR REPLACE FUNCTION update_faq_tsvector() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.ts := to_tsvector('english', 
        coalesce(NEW.section_title, '') || ' ' || 
        coalesce(NEW.content, '') || ' ' ||
        coalesce(NEW.guide_category, '') || ' ' ||
        coalesce(NEW.section_category, '')
    );
    RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Function to update tsvector for regulatory documents
CREATE OR REPLACE FUNCTION update_doc_tsvector() 
RETURNS TRIGGER AS $$
BEGIN
    NEW.ts := to_tsvector('english', 
        coalesce(NEW.section_title, '') || ' ' || 
        coalesce(NEW.content, '') || ' ' ||
        coalesce(NEW.document_name, '')
    );
    RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Create triggers for automatic updates
DROP TRIGGER IF EXISTS faq_tsvector_update ON faq_document_chunks;
CREATE TRIGGER faq_tsvector_update 
    BEFORE INSERT OR UPDATE ON faq_document_chunks
    FOR EACH ROW EXECUTE FUNCTION update_faq_tsvector();

DROP TRIGGER IF EXISTS doc_tsvector_update ON document_chunks;
CREATE TRIGGER doc_tsvector_update 
    BEFORE INSERT OR UPDATE ON document_chunks  
    FOR EACH ROW EXECUTE FUNCTION update_doc_tsvector();

-- =============================================================================
-- 4. PERFORMANCE ANALYSIS VIEWS
-- =============================================================================

-- View for analyzing hybrid search performance on FAQ
CREATE OR REPLACE VIEW faq_search_analytics AS
SELECT 
    guide_category,
    COUNT(*) as total_chunks,
    AVG(LENGTH(content)) as avg_content_length,
    COUNT(DISTINCT document_name) as unique_documents
FROM faq_document_chunks
GROUP BY guide_category;

-- View for analyzing hybrid search performance on regulatory docs
CREATE OR REPLACE VIEW doc_search_analytics AS  
SELECT 
    document_name,
    COUNT(*) as total_chunks,
    AVG(LENGTH(content)) as avg_content_length,
    MIN(page_number) as first_page,
    MAX(page_number) as last_page
FROM document_chunks
GROUP BY document_name
ORDER BY total_chunks DESC;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Test FAQ hybrid search
-- SELECT * FROM match_faq_documents_hybrid(
--     '[...]'::vector(768), 
--     'home care facility nearby',
--     10
-- );

-- Test regulatory hybrid search  
-- SELECT * FROM match_documents_hybrid(
--     '[...]'::vector(768),
--     'aged care fee schedule',
--     10
-- ); 