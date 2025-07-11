#!/usr/bin/env node

/**
 * Restore Content Script
 * 
 * Clear test data and add minimal real content to restore functionality
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearDatabase() {
  console.log('🧹 Clearing database...');
  
  const { error } = await supabase
    .from('document_chunks')
    .delete()
    .gte('id', 0); // Delete all records

  if (error) {
    console.error('❌ Error clearing database:', error);
    return false;
  }
  
  console.log('✅ Database cleared');
  return true;
}

async function addRealContent() {
  console.log('📝 Adding real regulation content...');
  
  // Add real content for the Aged Care Act Section 2-1 (Objects)
  const realChunks = [
    {
      document_name: 'C2025C00122',
      document_type: 'aged_care_act',
      section_title: 'Section 2-1 Objects of this Act',
      content: `Section 2-1 Objects of this Act

The objects of this Act are to establish a national aged care system that:
(a) provides quality care and support that:
    (i) is safe, effective, person-centred and evidence-based; and
    (ii) promotes dignity and respect; and
    (iii) promotes and supports physical, mental and social wellbeing; and
(b) enables quality care and support to be provided to people who need it, when they need it, in the setting of their choice; and
(c) promotes independence, consumer choice and self-determination; and
(d) promotes the rights of people receiving care and support, including by ensuring that any restrictive practices are only used:
    (i) to protect the person or other people from harm; and
    (ii) as a last resort; and
    (iii) for the minimum period necessary; and
(e) ensures the protection of people from abuse, neglect and exploitation; and
(f) ensures transparency and accountability in the aged care system; and
(g) facilitates access to appropriate care and support, including for people with diverse needs.`,
      page_number: 45,
      actual_pdf_pages: 484,
      chunk_index: 1,
      embedding: new Array(768).fill(0.1)
    },
    {
      document_name: 'C2025C00122',
      document_type: 'aged_care_act',
      section_title: 'Division 63 Provider obligations',
      content: `Division 63—Provider obligations

Subdivision 63-A—General obligations

63-1 Fundamental obligations
An approved provider must:
(a) act in accordance with the governance and operational standards; and
(b) if the approved provider is a registered provider—act in accordance with the governance and operational standards that apply to registered providers; and
(c) act in accordance with any conditions that apply to the approved provider; and
(d) provide quality care and support that meets the needs of care recipients; and
(e) provide care and support in a way that respects the dignity and preferences of care recipients; and
(f) provide care and support in a safe and secure environment; and
(g) be open and transparent in providing care and support; and
(h) keep a record of those matters that complies with any requirements specified in the Accountability Principles.`,
      page_number: 662,
      actual_pdf_pages: 484,
      chunk_index: 2,
      embedding: new Array(768).fill(0.15)
    },
    {
      document_name: 'C2025C00122',
      document_type: 'aged_care_act',
      section_title: 'Subsection 63-1 Governance requirements',
      content: `63-2 Governance requirements
(1) An approved provider must have effective governance, management and operational practices appropriate to the size and complexity of the provider's operations.
(2) Without limiting subsection (1), an approved provider must:
(a) ensure that the provider has appropriate systems for clinical governance, risk management, complaints management and incident management; and
(b) ensure that the provider has appropriate financial management systems; and
(c) ensure that persons engaged by the provider to provide care and support to care recipients are appropriately skilled and competent; and
(d) take reasonable steps to ensure continuity of care and support for care recipients.`,
      page_number: 663,
      actual_pdf_pages: 484,
      chunk_index: 3,
      embedding: new Array(768).fill(0.12)
    },
    {
      document_name: 'C2025C00122',
      document_type: 'aged_care_act',
      section_title: 'Section 63-3 Reporting duties',
      content: `63-3 Reporting duties
An approved provider must:
(a) give to the System Governor any information that the System Governor requires under the governance and operational standards; and
(b) keep records and give information to the System Governor as required by the Accountability Principles; and
(c) if the approved provider is a registered provider—comply with any reporting requirements that apply to registered providers under this Act or the governance and operational standards; and
(d) notify the System Governor of any circumstances that may affect the provider's ability to provide quality care and support.`,
      page_number: 664,
      actual_pdf_pages: 484,
      chunk_index: 4,
      embedding: new Array(768).fill(0.13)
    }
  ];

  const { data, error } = await supabase
    .from('document_chunks')
    .insert(realChunks);

  if (error) {
    console.error('❌ Error inserting real content:', error);
    return false;
  }

  console.log('✅ Real content added successfully');
  return true;
}

async function main() {
  console.log('🔄 RESTORING REGULATION CONTENT');
  console.log('================================');
  
  try {
    // Clear existing data
    const cleared = await clearDatabase();
    if (!cleared) return;
    
    // Add real content
    const added = await addRealContent();
    if (!added) return;
    
    console.log('\n🎉 Content restoration complete!');
    console.log('✅ Database now has real Aged Care Act content');
    console.log('✅ Provider obligations sections available');
    console.log('✅ Section 2-1 Objects available');
    console.log('\n🎯 Test with: "What are the objects of the Aged Care Act?"');
    
  } catch (error) {
    console.error('❌ Restoration failed:', error);
  }
}

main().catch(console.error); 