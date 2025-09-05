#!/usr/bin/env node

/**
 * Gemini 2.5 Flash Model Testing Script
 * Tests availability and new features of Gemini 2.5 Flash
 */

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini25Flash() {
  try {
    console.log('='.repeat(60));
    console.log('🚀 GEMINI 2.5 FLASH MODEL TESTING');
    console.log('='.repeat(60));
    
    // Check if API key is available
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not found in environment variables');
    }
    
    console.log('🔑 API Key found, initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test models to try
    const modelsToTest = [
      'gemini-2.5-flash',
      'gemini-2.5-flash-thinking',
      'gemini-2.5-pro',
      'gemini-2.0-flash-exp',
      'gemini-1.5-flash',
      'gemini-1.5-pro'
    ];
    
    const workingModels = [];
    const failingModels = [];
    
    // Test each model
    for (const modelName of modelsToTest) {
      console.log(`\n🧪 Testing model: ${modelName}`);
      
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        const testPrompt = "Hello! Can you respond with just 'Model working' to confirm you're available?";
        
        // Try to generate content
        const result = await model.generateContent(testPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log(`✅ ${modelName}: Working`);
        console.log(`   Response: ${text.substring(0, 100)}...`);
        
        workingModels.push([modelName, text]);
        
      } catch (error) {
        console.log(`❌ ${modelName}: Failed - ${error.message}`);
        failingModels.push([modelName, error.message]);
      }
      
      // Add delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n📊 MODEL AVAILABILITY SUMMARY:');
    console.log('='.repeat(60));
    
    console.log(`✅ Working Models (${workingModels.length}):`);
    workingModels.forEach(([name, response]) => {
      console.log(`   - ${name}`);
    });
    
    console.log(`\n❌ Failed Models (${failingModels.length}):`);
    failingModels.forEach(([name, error]) => {
      console.log(`   - ${name}: ${error.substring(0, 100)}...`);
    });
    
    // Test thinking budget feature if 2.5 Flash is available
    const gemini25Available = workingModels.some(([name]) => name.includes('2.5'));
    
    if (gemini25Available) {
      console.log('\n🧠 TESTING THINKING BUDGET FEATURE:');
      console.log('='.repeat(60));
      
      try {
        // Find a working 2.5 model
        const working25Model = workingModels.find(([name]) => name.includes('2.5'));
        const modelName = working25Model[0];
        
        console.log(`🔬 Testing thinking budget with: ${modelName}`);
        
        const model = genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            // Test if thinking budget parameter is supported
            maxOutputTokens: 100,
            temperature: 0.1,
          }
        });
        
        const complexPrompt = `Solve this step by step: What is 15% of 240? Show your thinking process.`;
        
        console.log('   Testing complex reasoning task...');
        const result = await model.generateContent(complexPrompt);
        const response = await result.response;
        const text = response.text();
        
        console.log('✅ Thinking budget compatible model working!');
        console.log(`   Response length: ${text.length} characters`);
        console.log(`   Response preview: ${text.substring(0, 200)}...`);
        
        // Test embedding model as well
        console.log('\n🔤 TESTING EMBEDDING MODEL:');
        const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
        const embeddingResult = await embeddingModel.embedContent('Test embedding generation');
        
        if (embeddingResult.embedding && embeddingResult.embedding.values) {
          console.log(`✅ Embedding model working: ${embeddingResult.embedding.values.length} dimensions`);
        }
        
      } catch (error) {
        console.log(`❌ Thinking budget test failed: ${error.message}`);
      }
      
    } else {
      console.log('\n⚠️  No Gemini 2.5 models available - cannot test thinking budget feature');
    }
    
    // Generate recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    
    if (workingModels.length === 0) {
      console.log('❌ No models working - check API key and network connection');
    } else {
      console.log('✅ Model upgrade recommendations:');
      
      if (workingModels.some(([name]) => name === 'gemini-2.5-flash')) {
        console.log('   🎯 PRIMARY: Use gemini-2.5-flash for chat responses');
        console.log('   📝 Update regulationChat.ts: gemini-2.0-flash-exp → gemini-2.5-flash');
        console.log('   📝 Update faqChat.ts: Use gemini-2.5-flash from start');
        console.log('   🚀 Benefits: Better reasoning, thinking budget control, improved performance');
      } else if (workingModels.some(([name]) => name === 'gemini-2.0-flash-exp')) {
        console.log('   ⚠️  CURRENT: Continue with gemini-2.0-flash-exp');
        console.log('   📅 NOTE: Gemini 2.5 Flash may not be available yet in your region');
      } else {
        console.log('   🔄 FALLBACK: Use the first working model:');
        console.log(`      Recommended: ${workingModels[0][0]}`);
      }
      
      console.log('\n   📋 Next steps if Gemini 2.5 Flash is working:');
      console.log('      1. Update model references in codebase');
      console.log('      2. Add thinking budget parameters');
      console.log('      3. Test cost optimization features');
      console.log('      4. Update both regulation and FAQ systems');
    }
    
    console.log('\n✨ Gemini Model Testing Complete!');
    
  } catch (error) {
    console.error('❌ Fatal error during model testing:', error);
    
    if (error.message.includes('API_KEY')) {
      console.log('\n💡 SOLUTION: Check your Gemini API key in .env file');
      console.log('   Make sure GEMINI_API_KEY is set correctly');
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⚠️  Testing interrupted. Exiting...');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  testGemini25Flash().catch(error => {
    console.error('❌ Model testing failed:', error);
    process.exit(1);
  });
} 