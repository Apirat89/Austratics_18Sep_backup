#!/usr/bin/env node

/**
 * Fix Phantom Page Numbers
 * 
 * Update the provider obligations content to have correct page numbers
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixPhantomPages() {
  console.log('🔧 Fixing phantom page numbers...');
  
  try {
    // Update Division 63 Provider obligations (page 662 -> page 0 for uncertain)
    const { error: error1 } = await supabase
      .from('document_chunks')
      .update({ page_number: 0 }) // Use 0 for uncertain page
      .eq('section_title', 'Division 63 Provider obligations');
    
    if (error1) {
      console.error('❌ Error updating Division 63:', error1);
      return;
    }
    
    // Update Subsection 63-1 Governance requirements (page 663 -> page 0 for uncertain)
    const { error: error2 } = await supabase
      .from('document_chunks')
      .update({ page_number: 0 }) // Use 0 for uncertain page
      .eq('section_title', 'Subsection 63-1 Governance requirements');
    
    if (error2) {
      console.error('❌ Error updating Governance requirements:', error2);
      return;
    }
    
    // Update Section 63-3 Reporting duties (page 664 -> page 0 for uncertain)
    const { error: error3 } = await supabase
      .from('document_chunks')
      .update({ page_number: 0 }) // Use 0 for uncertain page
      .eq('section_title', 'Section 63-3 Reporting duties');
    
    if (error3) {
      console.error('❌ Error updating Reporting duties:', error3);
      return;
    }
    
    console.log('✅ Fixed phantom page numbers successfully!');
    console.log('📋 Updates:');
    console.log('   - Division 63 Provider obligations: Page 662 → Page 0 (uncertain)');
    console.log('   - Governance requirements: Page 663 → Page 0 (uncertain)');
    console.log('   - Reporting duties: Page 664 → Page 0 (uncertain)');
    console.log('   - Section 2-1 Objects: Page 45 (valid, no change)');
    
  } catch (error) {
    console.error('❌ Error fixing phantom pages:', error);
  }
}

fixPhantomPages(); 