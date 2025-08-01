-- Fix for ambiguous column reference in RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can view messages in their own conversations" ON regulation_messages;
DROP POLICY IF EXISTS "Users can insert messages in their own conversations" ON regulation_messages;
DROP POLICY IF EXISTS "Users can update messages in their own conversations" ON regulation_messages;
DROP POLICY IF EXISTS "Users can delete messages in their own conversations" ON regulation_messages;

-- Recreate policies with fully qualified column names
CREATE POLICY "Users can view messages in their own conversations" 
  ON regulation_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in their own conversations" 
  ON regulation_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update messages in their own conversations" 
  ON regulation_messages FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete messages in their own conversations" 
  ON regulation_messages FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM regulation_conversations 
      WHERE regulation_conversations.id = regulation_messages.conversation_id 
      AND regulation_conversations.user_id = auth.uid()
    )
  ); 