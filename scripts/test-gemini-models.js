#!/usr/bin/env node

/**
 * Test Gemini Models Used in RegulationChatService
 * 
 * This script tests the exact Gemini models used in the chat service
 * to verify they work with the current API.
 */

const dotenv = require('dotenv');
dotenv.config();

console.log('🔍 Testing Gemini Models Used in RegulationChatService');
console.log('=====================================================\n');

async function testGeminiModel(modelName, description) {
  console.log(`🧪 Testing ${description}: ${modelName}`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.log('❌ GEMINI_API_KEY missing');
    return false;
  }
  
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
      model: modelName,
      generationConfig: {
        temperature: 0.03,
        maxOutputTokens: 100,
        topP: 0.75,
        topK: 15
      }
    });
    
    const result = await model.generateContent('Test question: What is aged care?');
    const response = await result.response;
    const text = response.text();
    
    console.log(`✅ ${modelName} works!`);
    console.log(`   Response preview: "${text.substring(0, 80)}..."`);
    return true;
    
  } catch (error) {
    console.error(`❌ ${modelName} failed:`, error.message);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('   Issue: Invalid API key');
    } else if (error.message.includes('not found')) {
      console.log('   Issue: Model not available');
    } else if (error.message.includes('quota')) {
      console.log('   Issue: API quota exceeded');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('   Issue: API key lacks permissions');
    }
    
    return false;
  }
}

async function testAllModels() {
  console.log('🚀 Testing all Gemini models used in the chat service...\n');
  
  const models = [
    { name: 'gemini-2.0-flash-exp', description: 'Main model used in RegulationChatService' },
    { name: 'gemini-1.5-flash', description: 'Alternative stable model' },
    { name: 'gemini-1.5-pro', description: 'Alternative pro model' }
  ];
  
  const results = {};
  
  for (const { name, description } of models) {
    results[name] = await testGeminiModel(name, description);
    console.log();
  }
  
  return results;
}

async function generateReport(results) {
  console.log('📋 GEMINI API DIAGNOSIS REPORT');
  console.log('==============================\n');
  
  const working = Object.entries(results).filter(([name, success]) => success);
  const failing = Object.entries(results).filter(([name, success]) => !success);
  
  if (working.length > 0) {
    console.log('✅ **Working Models:**');
    working.forEach(([name]) => console.log(`   - ${name}`));
    console.log();
  }
  
  if (failing.length > 0) {
    console.log('❌ **Failing Models:**');
    failing.forEach(([name]) => console.log(`   - ${name}`));
    console.log();
    
    if (failing.some(([name]) => name === 'gemini-2.0-flash-exp')) {
      console.log('🚨 **CRITICAL: Main chat model is failing!**');
      console.log('This explains why conversations are not being saved.');
      console.log('The chat service fails to generate AI responses, so the entire conversation flow breaks.\n');
      
      if (working.length > 0) {
        console.log('🔧 **SOLUTION: Update RegulationChatService to use a working model**');
        console.log(`Recommended: Change 'gemini-2.0-flash-exp' to '${working[0][0]}' in src/lib/regulationChat.ts`);
      } else {
        console.log('🔧 **SOLUTION: Fix Gemini API access**');
        console.log('1. Check if GEMINI_API_KEY is valid');
        console.log('2. Verify API key has proper permissions');
        console.log('3. Check if quota is exceeded');
        console.log('4. Try regenerating the API key in Google AI Studio');
      }
    }
  } else {
    console.log('🎉 **All Gemini models are working!**');
    console.log('The Gemini API is not the issue preventing conversation saving.');
    console.log('The problem is likely related to user authentication or database permissions.');
  }
}

async function main() {
  // Install @google/generative-ai if needed
  try {
    require('@google/generative-ai');
  } catch (error) {
    console.log('📦 Installing @google/generative-ai...');
    const { exec } = require('child_process');
    await new Promise((resolve) => {
      exec('npm install @google/generative-ai --legacy-peer-deps', (error) => {
        if (error) {
          console.log('❌ Could not install @google/generative-ai');
          process.exit(1);
        } else {
          console.log('✅ @google/generative-ai installed\n');
        }
        resolve();
      });
    });
  }
  
  const results = await testAllModels();
  await generateReport(results);
}

main().catch(console.error); 