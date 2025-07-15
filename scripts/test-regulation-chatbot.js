#!/usr/bin/env node

/**
 * Comprehensive Testing Framework for Regulation Chatbot
 * 
 * This script validates legal accuracy, response quality, and prevents regressions
 * in the aged care regulation chatbot system.
 */

const http = require('http'); // Changed from https to http
const fs = require('fs');
const path = require('path');

class RegulationChatbotTester {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
    this.testResults = [];
    this.passed = 0;
    this.failed = 0;
    this.startTime = Date.now();
  }

  /**
   * Legal test cases for validation
   */
  getTestCases() {
    return [
      {
        id: 'legal-001',
        category: 'Core Legal Content',
        question: 'What are the objects of the Aged Care Act?',
        expectedContent: [
          'Section 2-1',
          'objects of this Act',
          'funding of',
          'aged care',
          'quality of the care',
          'type of care and level of care provided',
          'appropriate outcomes for recipients',
          'accountability of the providers'
        ],
        requiredCitations: ['C2025C00122', 'Section 2-1', 'Page 56'],
        shouldNotContain: ['details not provided', 'not available', 'cannot answer'],
        minLength: 500,
        maxResponseTime: 10000
      },
      {
        id: 'legal-002',
        category: 'Legal Structure',
        question: 'What does Section 2-1 of the Aged Care Act say?',
        expectedContent: [
          'Section 2-1',
          'The objects of this Act',
          '(a)',
          '(b)',
          '(c)',
          'subsection'
        ],
        requiredCitations: ['Section 2-1'],
        shouldNotContain: ['details not provided'],
        minLength: 300,
        maxResponseTime: 8000
      },
      {
        id: 'legal-003',
        category: 'Specific Legal Queries',
        question: 'What are the funding requirements for aged care?',
        expectedContent: [
          'funding',
          'aged care',
          'quality of the care',
          'accountability'
        ],
        requiredCitations: ['Page'],
        shouldNotContain: ['NOT IN CORPUS'],
        minLength: 200,
        maxResponseTime: 8000
      },
      {
        id: 'legal-004',
        category: 'Citation Accuracy',
        question: 'Tell me about Division 2 Objects in the Aged Care Act',
        expectedContent: [
          'Division 2',
          'Objects',
          'Section 2-1'
        ],
        requiredCitations: ['Division 2', 'Objects'],
        shouldNotContain: ['details not provided'],
        minLength: 200,
        maxResponseTime: 8000
      },
      {
        id: 'legal-005',
        category: 'Complex Legal Questions',
        question: 'How does the Aged Care Act ensure quality of care?',
        expectedContent: [
          'quality',
          'care',
          'recipients'
        ],
        requiredCitations: ['Page'],
        shouldNotContain: ['NOT IN CORPUS'],
        minLength: 150,
        maxResponseTime: 8000
      },
      {
        id: 'edge-001',
        category: 'Edge Cases',
        question: 'What is the definition of xyz123 in the Aged Care Act?',
        expectedContent: ['NOT IN CORPUS'],
        requiredCitations: [],
        shouldNotContain: ['Section 2-1'],
        minLength: 20,
        maxResponseTime: 5000
      },
      {
        id: 'cite-001',
        category: 'Citation Validation',
        question: 'What are the objects of aged care?',
        expectedContent: [],
        requiredCitations: ['[', ']', 'Page'],
        shouldNotContain: [],
        minLength: 100,
        maxResponseTime: 8000
      }
    ];
  }

  /**
   * Make API request to regulation chatbot
   */
  async makeApiRequest(question) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ question });
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/regulation/chat',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 15000
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(body);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse response: ${error.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Run a single test case
   */
  async runTest(testCase) {
    const testStart = Date.now();
    const result = {
      id: testCase.id,
      category: testCase.category,
      question: testCase.question,
      passed: false,
      errors: [],
      warnings: [],
      response: null,
      responseTime: 0,
      timestamp: new Date().toISOString()
    };

    try {
      console.log(`\n🧪 Testing ${testCase.id}: ${testCase.category}`);
      console.log(`❓ Question: "${testCase.question}"`);

      // Make API request
      const apiResponse = await this.makeApiRequest(testCase.question);
      result.responseTime = Date.now() - testStart;
      
      if (!apiResponse.success || !apiResponse.data) {
        result.errors.push('API request failed or returned no data');
        return result;
      }

      const { message, citations, processing_time } = apiResponse.data;
      result.response = {
        message,
        citations: citations?.length || 0,
        processing_time
      };

      console.log(`⏱️  Response time: ${result.responseTime}ms (API: ${processing_time}ms)`);
      console.log(`📄 Citations found: ${citations?.length || 0}`);

      // Validation tests
      let passed = true;

      // Test 1: Response time
      if (result.responseTime > testCase.maxResponseTime) {
        result.errors.push(`Response time too slow: ${result.responseTime}ms > ${testCase.maxResponseTime}ms`);
        passed = false;
      }

      // Test 2: Minimum length
      if (message.length < testCase.minLength) {
        result.errors.push(`Response too short: ${message.length} chars < ${testCase.minLength} chars`);
        passed = false;
      }

      // Test 3: Required content
      for (const required of testCase.expectedContent) {
        if (!message.toLowerCase().includes(required.toLowerCase())) {
          result.errors.push(`Missing required content: "${required}"`);
          passed = false;
        }
      }

      // Test 4: Forbidden content
      for (const forbidden of testCase.shouldNotContain) {
        if (message.toLowerCase().includes(forbidden.toLowerCase())) {
          result.errors.push(`Contains forbidden content: "${forbidden}"`);
          passed = false;
        }
      }

      // Test 5: Required citations
      for (const requiredCitation of testCase.requiredCitations) {
        if (!message.includes(requiredCitation)) {
          result.errors.push(`Missing required citation: "${requiredCitation}"`);
          passed = false;
        }
      }

      // Test 6: Citation format validation
      if (citations && citations.length > 0) {
        const hasProperCitations = message.includes('[') && message.includes(']');
        if (!hasProperCitations) {
          result.warnings.push('Citations found but not properly formatted in response');
        }
      }

      // Test 7: Legal accuracy checks
      if (testCase.category === 'Core Legal Content') {
        if (!message.includes('Section 2-1') && !message.includes('NOT IN CORPUS')) {
          result.errors.push('Core legal content missing Section 2-1 reference');
          passed = false;
        }
      }

      result.passed = passed;

      // Output results
      if (passed) {
        console.log(`✅ PASSED: ${testCase.id}`);
        this.passed++;
      } else {
        console.log(`❌ FAILED: ${testCase.id}`);
        result.errors.forEach(error => console.log(`   ❌ ${error}`));
        this.failed++;
      }

      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.log(`   ⚠️  ${warning}`));
      }

      // Show response preview
      const preview = message.substring(0, 150) + (message.length > 150 ? '...' : '');
      console.log(`📝 Response preview: "${preview}"`);

    } catch (error) {
      result.errors.push(`Test execution failed: ${error.message}`);
      result.passed = false;
      console.log(`❌ FAILED: ${testCase.id} - ${error.message}`);
      this.failed++;
    }

    this.testResults.push(result);
    return result;
  }

  /**
   * Generate detailed test report
   */
  generateReport() {
    const totalTime = Date.now() - this.startTime;
    const total = this.passed + this.failed;
    const passRate = ((this.passed / total) * 100).toFixed(1);

    const report = {
      summary: {
        total,
        passed: this.passed,
        failed: this.failed,
        passRate: `${passRate}%`,
        totalTime: `${totalTime}ms`,
        timestamp: new Date().toISOString()
      },
      testResults: this.testResults,
      failedTests: this.testResults.filter(r => !r.passed),
      categories: this.analyzeByCategory()
    };

    return report;
  }

  /**
   * Analyze results by category
   */
  analyzeByCategory() {
    const categories = {};
    
    this.testResults.forEach(result => {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      
      categories[result.category].total++;
      if (result.passed) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    });

    Object.keys(categories).forEach(cat => {
      const c = categories[cat];
      c.passRate = `${((c.passed / c.total) * 100).toFixed(1)}%`;
    });

    return categories;
  }

  /**
   * Save detailed report to file
   */
  saveReport(report) {
    const reportsDir = path.join(__dirname, '..', 'test-reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `regulation-chatbot-test-${timestamp}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${filepath}`);

    // Also save a summary report
    const summaryFilename = `regulation-chatbot-summary-${timestamp}.txt`;
    const summaryFilepath = path.join(reportsDir, summaryFilename);
    
    const summaryText = this.generateSummaryText(report);
    fs.writeFileSync(summaryFilepath, summaryText);
    console.log(`📄 Summary report saved: ${summaryFilepath}`);
  }

  /**
   * Generate human-readable summary
   */
  generateSummaryText(report) {
    const { summary, categories, failedTests } = report;
    
    let text = `REGULATION CHATBOT TEST REPORT\n`;
    text += `=====================================\n\n`;
    text += `Test Run: ${summary.timestamp}\n`;
    text += `Total Tests: ${summary.total}\n`;
    text += `Passed: ${summary.passed}\n`;
    text += `Failed: ${summary.failed}\n`;
    text += `Pass Rate: ${summary.passRate}\n`;
    text += `Total Time: ${summary.totalTime}\n\n`;

    text += `RESULTS BY CATEGORY:\n`;
    text += `--------------------\n`;
    Object.entries(categories).forEach(([cat, stats]) => {
      text += `${cat}: ${stats.passed}/${stats.total} (${stats.passRate})\n`;
    });

    if (failedTests.length > 0) {
      text += `\nFAILED TESTS:\n`;
      text += `-------------\n`;
      failedTests.forEach(test => {
        text += `${test.id}: ${test.category}\n`;
        text += `  Question: ${test.question}\n`;
        test.errors.forEach(error => {
          text += `  ❌ ${error}\n`;
        });
        text += `\n`;
      });
    }

    return text;
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Regulation Chatbot Test Suite');
    console.log('==========================================');

    const testCases = this.getTestCases();
    console.log(`📋 Running ${testCases.length} test cases...\n`);

    // Run tests sequentially to avoid overwhelming the API
    for (const testCase of testCases) {
      await this.runTest(testCase);
      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate and display report
    const report = this.generateReport();
    
    console.log('\n🎯 TEST SUMMARY');
    console.log('===============');
    console.log(`Total Tests: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed} ✅`);
    console.log(`Failed: ${report.summary.failed} ❌`);
    console.log(`Pass Rate: ${report.summary.passRate}`);
    console.log(`Total Time: ${report.summary.totalTime}`);

    console.log('\n📊 CATEGORY BREAKDOWN:');
    Object.entries(report.categories).forEach(([category, stats]) => {
      const icon = stats.failed === 0 ? '✅' : '⚠️';
      console.log(`${icon} ${category}: ${stats.passed}/${stats.total} (${stats.passRate})`);
    });

    // Save detailed report
    this.saveReport(report);

    // Exit with appropriate code
    const exitCode = this.failed > 0 ? 1 : 0;
    console.log(`\n${exitCode === 0 ? '🎉 All tests passed!' : '⚠️ Some tests failed!'}`);
    
    return exitCode;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new RegulationChatbotTester();
  tester.runAllTests()
    .then(exitCode => process.exit(exitCode))
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = RegulationChatbotTester; 