-- Migration script to convert existing regulation_search_history to conversations
-- This script preserves all existing user data and creates conversation-based format

-- First, let's create a backup of the existing data
CREATE TABLE IF NOT EXISTS regulation_search_history_backup AS 
SELECT * FROM regulation_search_history;

-- Create the main migration function
CREATE OR REPLACE FUNCTION migrate_regulation_history_to_conversations()
RETURNS TABLE (
    migrated_users INTEGER,
    migrated_conversations INTEGER,
    migrated_messages INTEGER,
    skipped_records INTEGER,
    migration_errors TEXT[]
) AS $$
DECLARE
    user_record RECORD;
    history_record RECORD;
    new_conversation_id BIGINT;
    user_message_id BIGINT;
    assistant_message_id BIGINT;
    migrated_users_count INTEGER := 0;
    migrated_conversations_count INTEGER := 0;
    migrated_messages_count INTEGER := 0;
    skipped_records_count INTEGER := 0;
    errors TEXT[] := ARRAY[]::TEXT[];
    error_message TEXT;
    
BEGIN
    -- Log migration start
    RAISE NOTICE 'Starting migration of regulation_search_history to conversations at %', NOW();
    
    -- Loop through each user who has search history
    FOR user_record IN (
        SELECT DISTINCT user_id 
        FROM regulation_search_history 
        WHERE user_id IS NOT NULL
        ORDER BY user_id
    ) LOOP
        
        BEGIN
            RAISE NOTICE 'Processing user: %', user_record.user_id;
            
            -- Process each search history record for this user
            FOR history_record IN (
                SELECT * 
                FROM regulation_search_history 
                WHERE user_id = user_record.user_id
                ORDER BY updated_at ASC
            ) LOOP
            
                BEGIN
                    -- Skip records with no search term
                    IF history_record.search_term IS NULL OR LENGTH(TRIM(history_record.search_term)) = 0 THEN
                        skipped_records_count := skipped_records_count + 1;
                        CONTINUE;
                    END IF;
                    
                    -- Create a new conversation for each history record
                    INSERT INTO regulation_conversations (
                        user_id,
                        title,
                        summary,
                        message_count,
                        first_message_preview,
                        last_message_preview,
                        document_types,
                        total_citations,
                        total_processing_time,
                        status,
                        created_at,
                        updated_at
                    ) VALUES (
                        history_record.user_id,
                        generate_conversation_title(history_record.search_term),
                        CASE 
                            WHEN history_record.response_preview IS NOT NULL 
                            THEN 'Historical search: ' || LEFT(history_record.response_preview, 100)
                            ELSE 'Historical search converted from old format'
                        END,
                        2, -- Always 2 messages: user question + assistant response
                        LEFT(history_record.search_term, 150),
                        LEFT(COALESCE(history_record.response_preview, 'Response data not available'), 150),
                        CASE 
                            WHEN history_record.document_types IS NOT NULL 
                            THEN history_record.document_types
                            ELSE ARRAY[]::TEXT[]
                        END,
                        COALESCE(history_record.citations_count, 0),
                        COALESCE(history_record.processing_time, 0),
                        'active',
                        COALESCE(history_record.created_at, NOW()),
                        COALESCE(history_record.updated_at, NOW())
                    ) RETURNING id INTO new_conversation_id;
                    
                    -- Create user message (index 0)
                    INSERT INTO regulation_messages (
                        conversation_id,
                        message_index,
                        role,
                        content,
                        search_intent,
                        created_at,
                        updated_at
                    ) VALUES (
                        new_conversation_id,
                        0,
                        'user',
                        history_record.search_term,
                        'question', -- Default intent for migrated data
                        COALESCE(history_record.created_at, NOW()),
                        COALESCE(history_record.created_at, NOW())
                    ) RETURNING id INTO user_message_id;
                    
                    -- Create assistant response message (index 1)
                    INSERT INTO regulation_messages (
                        conversation_id,
                        message_index,
                        role,
                        content,
                        citations,
                        context_used,
                        processing_time,
                        created_at,
                        updated_at
                    ) VALUES (
                        new_conversation_id,
                        1,
                        'assistant',
                        COALESCE(
                            history_record.response_preview,
                            'Response data not available from historical record'
                        ),
                        '[]'::JSONB, -- Empty citations array for historical data
                        0, -- No context tracking in old system
                        COALESCE(history_record.processing_time, 0),
                        COALESCE(history_record.updated_at, NOW()),
                        COALESCE(history_record.updated_at, NOW())
                    ) RETURNING id INTO assistant_message_id;
                    
                    migrated_conversations_count := migrated_conversations_count + 1;
                    migrated_messages_count := migrated_messages_count + 2;
                    
                    -- Log progress every 100 conversations
                    IF migrated_conversations_count % 100 = 0 THEN
                        RAISE NOTICE 'Migrated % conversations so far...', migrated_conversations_count;
                    END IF;
                    
                EXCEPTION
                    WHEN OTHERS THEN
                        error_message := format(
                            'Error migrating history record ID %s for user %s: %s',
                            history_record.id,
                            history_record.user_id,
                            SQLERRM
                        );
                        errors := array_append(errors, error_message);
                        RAISE WARNING '%', error_message;
                        skipped_records_count := skipped_records_count + 1;
                END;
            END LOOP;
            
            migrated_users_count := migrated_users_count + 1;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_message := format(
                    'Error processing user %s: %s',
                    user_record.user_id,
                    SQLERRM
                );
                errors := array_append(errors, error_message);
                RAISE WARNING '%', error_message;
        END;
    END LOOP;
    
    -- Log migration completion
    RAISE NOTICE 'Migration completed at %', NOW();
    RAISE NOTICE 'Summary: Users: %, Conversations: %, Messages: %, Skipped: %, Errors: %', 
        migrated_users_count, migrated_conversations_count, migrated_messages_count, 
        skipped_records_count, array_length(errors, 1);
    
    -- Return summary
    RETURN QUERY SELECT 
        migrated_users_count,
        migrated_conversations_count,
        migrated_messages_count,
        skipped_records_count,
        errors;
        
END;
$$ LANGUAGE plpgsql;

-- Create function to verify migration integrity
CREATE OR REPLACE FUNCTION verify_migration_integrity()
RETURNS TABLE (
    check_name TEXT,
    expected_value BIGINT,
    actual_value BIGINT,
    status TEXT
) AS $$
DECLARE
    original_users BIGINT;
    original_records BIGINT;
    migrated_users BIGINT;
    migrated_conversations BIGINT;
    migrated_messages BIGINT;
    orphaned_messages BIGINT;
    
BEGIN
    -- Count original data
    SELECT COUNT(DISTINCT user_id) INTO original_users 
    FROM regulation_search_history 
    WHERE user_id IS NOT NULL;
    
    SELECT COUNT(*) INTO original_records 
    FROM regulation_search_history 
    WHERE user_id IS NOT NULL 
    AND search_term IS NOT NULL 
    AND LENGTH(TRIM(search_term)) > 0;
    
    -- Count migrated data
    SELECT COUNT(DISTINCT user_id) INTO migrated_users 
    FROM regulation_conversations;
    
    SELECT COUNT(*) INTO migrated_conversations 
    FROM regulation_conversations;
    
    SELECT COUNT(*) INTO migrated_messages 
    FROM regulation_messages;
    
    -- Check for orphaned messages
    SELECT COUNT(*) INTO orphaned_messages
    FROM regulation_messages m
    WHERE NOT EXISTS (
        SELECT 1 FROM regulation_conversations c
        WHERE c.id = m.conversation_id
    );
    
    -- Return verification results
    RETURN QUERY VALUES
        ('Original Users', original_users, migrated_users, 
         CASE WHEN original_users = migrated_users THEN 'PASS' ELSE 'FAIL' END),
        ('Original Records', original_records, migrated_conversations,
         CASE WHEN original_records = migrated_conversations THEN 'PASS' ELSE 'FAIL' END),
        ('Expected Messages', original_records * 2, migrated_messages,
         CASE WHEN original_records * 2 = migrated_messages THEN 'PASS' ELSE 'FAIL' END),
        ('Orphaned Messages', 0::BIGINT, orphaned_messages,
         CASE WHEN orphaned_messages = 0 THEN 'PASS' ELSE 'FAIL' END);
         
END;
$$ LANGUAGE plpgsql;

-- Create function to rollback migration if needed
CREATE OR REPLACE FUNCTION rollback_migration()
RETURNS TEXT AS $$
BEGIN
    -- This function allows rollback in case of issues
    -- Drop the new tables and restore from backup
    
    RAISE NOTICE 'Rolling back migration...';
    
    -- Disable triggers temporarily
    SET session_replication_role = replica;
    
    -- Clear conversation data
    DELETE FROM regulation_messages;
    DELETE FROM regulation_conversations;
    
    -- Re-enable triggers
    SET session_replication_role = DEFAULT;
    
    RAISE NOTICE 'Migration rollback completed. Original data preserved in regulation_search_history.';
    
    RETURN 'Migration rolled back successfully';
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up after successful migration
CREATE OR REPLACE FUNCTION finalize_migration()
RETURNS TEXT AS $$
BEGIN
    -- This function should be called only after verifying migration success
    -- It will rename the old table and clean up backup
    
    RAISE NOTICE 'Finalizing migration...';
    
    -- Rename the original table to indicate it's archived
    ALTER TABLE regulation_search_history RENAME TO regulation_search_history_archived;
    
    -- Drop the backup table
    DROP TABLE IF EXISTS regulation_search_history_backup;
    
    RAISE NOTICE 'Migration finalized. Original table archived as regulation_search_history_archived';
    
    RETURN 'Migration finalized successfully';
END;
$$ LANGUAGE plpgsql;

-- Create function to update existing bookmarks to reference conversations
CREATE OR REPLACE FUNCTION migrate_regulation_bookmarks()
RETURNS TABLE (
    migrated_bookmarks INTEGER,
    skipped_bookmarks INTEGER,
    errors TEXT[]
) AS $$
DECLARE
    bookmark_record RECORD;
    matching_conversation_id BIGINT;
    migrated_count INTEGER := 0;
    skipped_count INTEGER := 0;
    errors TEXT[] := ARRAY[]::TEXT[];
    error_message TEXT;
    
BEGIN
    RAISE NOTICE 'Starting migration of regulation bookmarks...';
    
    -- Loop through existing bookmarks
    FOR bookmark_record IN (
        SELECT * FROM regulation_bookmarks
        ORDER BY created_at ASC
    ) LOOP
        
        BEGIN
            -- Find matching conversation based on search term and user
            SELECT c.id INTO matching_conversation_id
            FROM regulation_conversations c
            JOIN regulation_messages m ON c.id = m.conversation_id
            WHERE c.user_id = bookmark_record.user_id
            AND m.role = 'user'
            AND m.message_index = 0
            AND m.content = bookmark_record.search_term
            ORDER BY c.created_at ASC
            LIMIT 1;
            
            IF matching_conversation_id IS NOT NULL THEN
                -- Update conversation to mark as bookmarked
                UPDATE regulation_conversations
                SET is_bookmarked = true
                WHERE id = matching_conversation_id;
                
                migrated_count := migrated_count + 1;
                
            ELSE
                -- No matching conversation found
                skipped_count := skipped_count + 1;
                error_message := format(
                    'No matching conversation found for bookmark: user=%s, search_term=%s',
                    bookmark_record.user_id,
                    bookmark_record.search_term
                );
                errors := array_append(errors, error_message);
            END IF;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_message := format(
                    'Error migrating bookmark ID %s: %s',
                    bookmark_record.id,
                    SQLERRM
                );
                errors := array_append(errors, error_message);
                skipped_count := skipped_count + 1;
        END;
    END LOOP;
    
    RAISE NOTICE 'Bookmark migration completed: migrated=%, skipped=%, errors=%',
        migrated_count, skipped_count, array_length(errors, 1);
    
    RETURN QUERY SELECT migrated_count, skipped_count, errors;
END;
$$ LANGUAGE plpgsql;

-- Success message
SELECT 'Migration functions created successfully! 🎉' as status;

-- Usage instructions
SELECT '
MIGRATION INSTRUCTIONS:
1. First, run the migration: SELECT * FROM migrate_regulation_history_to_conversations();
2. Verify the migration: SELECT * FROM verify_migration_integrity();
3. If verification passes, migrate bookmarks: SELECT * FROM migrate_regulation_bookmarks();
4. If everything looks good, finalize: SELECT finalize_migration();
5. If there are issues, rollback: SELECT rollback_migration();

The original data will be preserved until you run finalize_migration().
' as instructions;

-- Comments for documentation
COMMENT ON FUNCTION migrate_regulation_history_to_conversations() IS 'Migrates existing regulation_search_history data to conversation format';
COMMENT ON FUNCTION verify_migration_integrity() IS 'Verifies that migration completed correctly by comparing data counts';
COMMENT ON FUNCTION rollback_migration() IS 'Rolls back migration in case of issues';
COMMENT ON FUNCTION finalize_migration() IS 'Finalizes migration by archiving original table';
COMMENT ON FUNCTION migrate_regulation_bookmarks() IS 'Updates existing bookmarks to reference conversations'; 