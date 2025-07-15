-- Create regulation_feedback table for tracking user feedback on chatbot responses
CREATE TABLE IF NOT EXISTS regulation_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL, -- Unique identifier for the chat message
  search_term TEXT NOT NULL, -- The user's original question
  response_preview TEXT, -- First 200 chars of the AI response
  feedback_type VARCHAR(10) NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  feedback_comment TEXT, -- Optional user comment about the feedback
  processing_time INTEGER, -- Response processing time in ms
  citations_count INTEGER DEFAULT 0, -- Number of citations in the response
  document_types TEXT[], -- Array of document types referenced
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_regulation_feedback_user_id ON regulation_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_regulation_feedback_message_id ON regulation_feedback(message_id);
CREATE INDEX IF NOT EXISTS idx_regulation_feedback_type ON regulation_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_regulation_feedback_created_at ON regulation_feedback(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE regulation_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own feedback" ON regulation_feedback;
DROP POLICY IF EXISTS "Users can insert their own feedback" ON regulation_feedback;
DROP POLICY IF EXISTS "Users can update their own feedback" ON regulation_feedback;
DROP POLICY IF EXISTS "Users can delete their own feedback" ON regulation_feedback;

-- Create RLS policies
CREATE POLICY "Users can view their own feedback" ON regulation_feedback
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON regulation_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own feedback" ON regulation_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own feedback" ON regulation_feedback
  FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_regulation_feedback_updated_at ON regulation_feedback;
CREATE TRIGGER update_regulation_feedback_updated_at
  BEFORE UPDATE ON regulation_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create analytics views
CREATE OR REPLACE VIEW regulation_feedback_analytics AS
SELECT
  DATE(created_at) as feedback_date,
  feedback_type,
  COUNT(*) as feedback_count,
  AVG(processing_time) as avg_processing_time,
  AVG(citations_count) as avg_citations_count
FROM regulation_feedback
GROUP BY DATE(created_at), feedback_type
ORDER BY feedback_date DESC;

-- Create user feedback summary view
CREATE OR REPLACE VIEW user_feedback_summary AS
SELECT
  user_id,
  COUNT(*) as total_feedback,
  COUNT(CASE WHEN feedback_type = 'positive' THEN 1 END) as positive_feedback,
  COUNT(CASE WHEN feedback_type = 'negative' THEN 1 END) as negative_feedback,
  ROUND(
    COUNT(CASE WHEN feedback_type = 'positive' THEN 1 END) * 100.0 / COUNT(*), 2
  ) as positive_percentage
FROM regulation_feedback
GROUP BY user_id;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON regulation_feedback TO authenticated;
GRANT SELECT ON regulation_feedback_analytics TO authenticated;
GRANT SELECT ON user_feedback_summary TO authenticated;

-- Success message
SELECT 'Regulation feedback system created successfully! 🎉' as status; 