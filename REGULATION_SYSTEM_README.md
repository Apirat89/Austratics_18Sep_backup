# Regulation Chatbot System - Technical Documentation

## Overview

The Regulation Chatbot is an AI-powered system for Australian aged care regulations that uses RAG (Retrieval Augmented Generation) to provide accurate answers by retrieving relevant documents and generating contextual responses with professional citations.

## 🏗️ System Architecture

### Core Components

1. **Document Processing Pipeline**: Converts PDFs to searchable vector embeddings
2. **Vector Search Engine**: Finds relevant document chunks using semantic similarity
3. **Citation Enhancement**: Maps technical file names to professional document titles
4. **AI Response Generation**: Creates contextual answers with proper citations
5. **Chat Interface**: Frontend for user interactions with conversation history

### Data Flow

```
PDF Documents → Text Extraction → Chunking → Vector Embeddings → Supabase Storage
                                                    ↓
User Query → Vector Search → Relevant Chunks → AI Processing → Response with Citations
```

## 📁 File Structure

### Core Application Files

```
src/
├── app/regulation/page.tsx          # Main regulation chatbot frontend
├── lib/
│   ├── regulationChat.ts           # Core chatbot logic & vector search
│   ├── documentTitleService.ts     # Citation title mapping service
│   └── pdfProcessor.ts             # PDF processing utilities
└── components/regulation/
    ├── FeedbackButtons.tsx         # User feedback interface
    └── RegulationHistoryPanel.tsx  # Chat history management
```

### Document Storage & Configuration

```
data/Regulation Docs/
├── file_titles.json                # File name to professional title mappings
├── Aged Care Act/                  # Current & historical aged care acts
├── CHSP will be part of.../        # Commonwealth Home Support Programme docs
├── Fee and Subsidies Aged Care/    # Fee schedules & financial documents
├── Home Care Package.../           # Home care package documentation
├── Residential aged care.../       # Residential care funding documents
├── Retirement Village Act/         # Retirement village regulations
└── Support at Home/                # Support at home program docs
```

### Processing Scripts

```
scripts/
├── processPDFs.ts                  # Main PDF processing script
├── fix-pdf-processing.ts           # Enhanced PDF processing with error handling
├── fix_embeddings.ts               # Embedding repair utilities
└── test_pdf_processing.ts          # PDF processing validation
```

## 🔧 Key System Components

### 1. DocumentTitleService (`src/lib/documentTitleService.ts`)

**Purpose**: Maps technical file names to professional document titles for citations

**Key Features**:
- Singleton pattern with in-memory caching
- Loads mappings from `data/Regulation Docs/file_titles.json`
- Handles variations (.pdf extensions, case sensitivity)
- Fallback formatting for unmapped files

**Usage**:
```typescript
const title = documentTitleService.getDocumentTitle('C2025C00122');
// Returns: "Aged Care Act 2024" instead of "C2025C00122"
```

### 2. RegulationChat Service (`src/lib/regulationChat.ts`)

**Purpose**: Core chatbot functionality with vector search and AI response generation

**Key Functions**:
- `searchRelevantDocuments()`: Vector similarity search
- `generateAnswer()`: AI response with citations
- `enhanceCitations()`: Adds professional titles to citations

**Citation Enhancement**:
```typescript
const citations: DocumentCitation[] = (data || []).map((chunk: any) => ({
  document_name: chunk.document_name,
  display_title: documentTitleService.getDocumentTitle(chunk.document_name),
  // ... other fields
}));
```

### 3. Frontend Interface (`src/app/regulation/page.tsx`)

**Purpose**: User interface for regulation chatbot interactions

**Key Features**:
- Real-time chat interface
- Citation display with professional titles
- Conversation history
- Source document references

## 💾 Data Storage

### Vector Embeddings (Supabase)

**Table**: `document_chunks`
**Location**: Supabase database
**Structure**:
```sql
- id: Primary key
- document_name: Source file name (without .pdf)
- document_type: Category (aged_care_act, retirement_village_act, etc.)
- section_title: Document section/chapter
- content: Text chunk content
- page_number: Source page number
- chunk_index: Chunk sequence number
- embedding: Vector embedding (9,484 dimensions, stored as string)
- created_at: Timestamp
- actual_pdf_pages: Total pages in source PDF
```

**Statistics**:
- **57 unique documents** processed
- **6,221 total chunks** with vector embeddings
- **68 title mappings** in file_titles.json

### Title Mappings (`data/Regulation Docs/file_titles.json`)

**Purpose**: Maps file names to professional document titles
**Format**:
```json
[
  {
    "File Name": "C2025C00122.pdf",
    "Title": "Aged Care Act 2024"
  },
  {
    "File Name": "schedule-of-fees-and-charges-for-residential-and-home-care 1 July 2024.pdf",
    "Title": "Schedule of fees and charges for residential and home care"
  }
]
```

## 🔄 Document Processing Workflow

### 1. PDF Processing
```bash
# Main processing (uses Gemini for embeddings)
npm run tsx scripts/processPDFs.ts

# Enhanced processing (handles difficult PDFs)
npm run tsx scripts/fix-pdf-processing.ts
```

### 2. Processing Steps
1. **PDF Text Extraction**: Uses pdf-parse library
2. **Text Chunking**: Splits into semantic chunks (~500 chars)
3. **Vector Embedding**: Generates embeddings via Gemini API
4. **Database Storage**: Stores chunks and embeddings in Supabase
5. **Title Mapping**: Associates files with professional titles

### 3. Processing Log
- **Location**: `processing_log.txt`
- **Content**: Real-time processing status, chunk counts, errors
- **Monitoring**: Track processing progress and identify issues

## 🎯 Citation System

### How Citations Work

1. **Vector Search**: Find relevant document chunks
2. **Title Enhancement**: Add professional titles via DocumentTitleService
3. **AI Context**: Provide professional titles to AI model
4. **Frontend Display**: Show professional titles to users

### Citation Flow
```
Database: "C2025C00122" → DocumentTitleService → "Aged Care Act 2024"
                              ↓
AI Context: "Document: Aged Care Act 2024, Section 5"
                              ↓
User Sees: [Aged Care Act 2024, Section 5]
```

## 🛠️ Maintenance Tasks

### Adding New Documents

1. **Add PDF files** to appropriate subdirectory in `data/Regulation Docs/`
2. **Run processing**: `npm run tsx scripts/processPDFs.ts`
3. **Extract title** from PDF first page
4. **Add mapping** to `file_titles.json`:
   ```json
   {
     "File Name": "new-document.pdf",
     "Title": "Professional Document Title"
   }
   ```
5. **Verify**: Test chatbot responses reference new document correctly

### Updating Existing Documents

1. **Replace PDF** in appropriate directory
2. **Update processing log** to track changes
3. **Re-run processing** if content significantly changed
4. **Update title mapping** if document title changed

### Title Mapping Maintenance

**Adding Missing Mappings**:
```bash
# 1. Identify unmapped documents
node -e "
const { createClient } = require('@supabase/supabase-js');
// Check for documents without title mappings
"

# 2. Extract titles from PDFs (automated)
# Create script to parse PDF first pages for titles

# 3. Update file_titles.json
# Add new entries in sorted order
```

### Database Maintenance

**Check Vector Embeddings**:
```sql
-- Count total chunks
SELECT COUNT(*) FROM document_chunks;

-- Count unique documents  
SELECT COUNT(DISTINCT document_name) FROM document_chunks;

-- Check embedding presence
SELECT COUNT(*) FROM document_chunks WHERE embedding IS NOT NULL;
```

## 🚨 Troubleshooting

### Common Issues

**1. Citations Show File Names Instead of Titles**
- **Cause**: Missing entries in `file_titles.json`
- **Solution**: Extract title from PDF and add mapping

**2. No Results for Document Queries**
- **Cause**: Document not processed or embedding failed
- **Check**: Query `document_chunks` table for document presence
- **Solution**: Re-run PDF processing

**3. PDF Processing Failures**
- **Cause**: PDF parsing issues, missing dependencies
- **Check**: `processing_log.txt` for error details
- **Solution**: Use `fix-pdf-processing.ts` for problematic PDFs

### Diagnostic Commands

```bash
# Check document processing status
node -e "
const fs = require('fs');
const log = fs.readFileSync('processing_log.txt', 'utf-8');
console.log('Last 20 lines:', log.split('\n').slice(-20));
"

# Verify title mappings
node -e "
const titles = require('./data/Regulation Docs/file_titles.json');
console.log('Total mappings:', titles.length);
console.log('Recent mappings:', titles.slice(-5));
"
```

## 🔐 Environment Configuration

### Required Environment Variables

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Services
GEMINI_API_KEY=your_gemini_api_key  # For embeddings
ANTHROPIC_API_KEY=your_anthropic_key  # For chat responses
```

### Configuration Files

- **Environment**: `.env.local` (development), `.env` (production)
- **Next.js**: `next.config.ts`
- **Database**: `supabase/config.toml`

## 📈 Performance Considerations

### Vector Search Optimization
- **Index Type**: HNSW index on embedding column
- **Search Limit**: Default 20 most relevant chunks
- **Similarity Threshold**: Configurable relevance filtering

### Caching Strategy
- **Title Mappings**: In-memory cache via DocumentTitleService singleton
- **Embeddings**: Stored in database, no additional caching
- **AI Responses**: No caching (real-time generation)

### Scalability Notes
- **Document Limit**: Supabase can handle thousands of documents
- **Embedding Size**: 9,484 dimensions per chunk (Gemini standard)
- **Processing Time**: ~1-2 minutes per document depending on size

## 🔄 System Updates

### Regular Maintenance
1. **Monthly**: Check for new regulation documents
2. **Quarterly**: Audit title mappings for accuracy
3. **As Needed**: Update AI prompts based on user feedback

### Version Control
- **Code Changes**: Standard Git workflow
- **Document Updates**: Track via processing logs
- **Schema Changes**: Supabase migrations in `supabase/migrations/`

## 📞 Support & References

### Key Files for Debugging
- `processing_log.txt`: Document processing history
- `src/lib/regulationChat.ts`: Core search logic
- `data/Regulation Docs/file_titles.json`: Title mappings
- `.cursor/scratchpad.md`: Development notes and project history

### External Dependencies
- **Supabase**: Database and vector storage
- **Gemini API**: Vector embeddings
- **Anthropic Claude**: AI response generation
- **pdf-parse**: PDF text extraction
- **Next.js**: Frontend framework

---

*Last Updated: Current as of citation enhancement completion*
*Document Status: All 57 documents processed with 100% title mapping coverage* 