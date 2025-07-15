-- 🚨 CRITICAL: Database Schema Update for Citation Validation
-- This script adds the actual_pdf_pages field to prevent phantom page number hallucinations

-- Step 1: Add actual_pdf_pages column to document_chunks table
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS actual_pdf_pages INT;

-- Step 2: Update the match_documents function to include actual_pdf_pages
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_name text,
  document_type text,
  section_title text,
  content text,
  page_number int,
  chunk_index int,
  actual_pdf_pages int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_name,
    document_chunks.document_type,
    document_chunks.section_title,
    document_chunks.content,
    document_chunks.page_number,
    document_chunks.chunk_index,
    document_chunks.actual_pdf_pages,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 3: Update the match_documents_by_type function (if it exists)
CREATE OR REPLACE FUNCTION match_documents_by_type (
  query_embedding vector(768),
  document_type text,
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id bigint,
  document_name text,
  document_type text,
  section_title text,
  content text,
  page_number int,
  chunk_index int,
  actual_pdf_pages int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_name,
    document_chunks.document_type,
    document_chunks.section_title,
    document_chunks.content,
    document_chunks.page_number,
    document_chunks.chunk_index,
    document_chunks.actual_pdf_pages,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  FROM document_chunks
  WHERE 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
    AND document_chunks.document_type = document_type
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 4: Create an index on actual_pdf_pages for performance
CREATE INDEX IF NOT EXISTS idx_document_chunks_actual_pdf_pages 
ON document_chunks(actual_pdf_pages);

-- Step 5: Add a validation function to check for phantom page numbers
CREATE OR REPLACE FUNCTION validate_page_numbers()
RETURNS TABLE (
  document_name text,
  invalid_page_number int,
  actual_pdf_pages int
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.document_name,
    dc.page_number,
    dc.actual_pdf_pages
  FROM document_chunks dc
  WHERE dc.actual_pdf_pages IS NOT NULL
    AND (dc.page_number < 1 OR dc.page_number > dc.actual_pdf_pages)
  ORDER BY dc.document_name, dc.page_number;
END;
$$;

-- Step 6: Create a view to show citation validation statistics
CREATE OR REPLACE VIEW citation_validation_stats AS
SELECT 
  document_name,
  COUNT(*) as total_chunks,
  MAX(actual_pdf_pages) as actual_pages,
  MAX(page_number) as max_cited_page,
  COUNT(CASE WHEN page_number > actual_pdf_pages THEN 1 END) as phantom_citations
FROM document_chunks
WHERE actual_pdf_pages IS NOT NULL
GROUP BY document_name
ORDER BY phantom_citations DESC, document_name;

-- Step 7: Add helper function for getting distinct document names
CREATE OR REPLACE FUNCTION get_distinct_document_names()
RETURNS TABLE (
  document_name text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT dc.document_name
  FROM document_chunks dc
  ORDER BY dc.document_name;
END;
$$;

-- Verification queries to run after schema update:
-- 1. Check if schema update was successful:
--    SELECT column_name FROM information_schema.columns WHERE table_name = 'document_chunks';
-- 
-- 2. Check for phantom page numbers:
--    SELECT * FROM validate_page_numbers();
-- 
-- 3. View citation validation stats:
--    SELECT * FROM citation_validation_stats; 