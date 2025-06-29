#!/usr/bin/env node

/**
 * Coverage Gap Analysis Script
 * Analyzes coverage-final.json to identify files that need additional tests
 * to meet the project's coverage thresholds.
 */

const fs = require('fs');
const path = require('path');

// Coverage thresholds from vitest.config.ts
const THRESHOLDS = {
  lines: 80,
  functions: 80,
  branches: 75,
  statements: 80
};

function loadCoverageData() {
  const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-final.json');
  
  if (!fs.existsSync(coveragePath)) {
    console.error('❌ Coverage file not found. Run: npm run test -- --coverage');
    process.exit(1);
  }
  
  return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
}

function calculateCoverage(data) {
  const { s: statements, f: functions, b: branches } = data;
  
  const stmtTotal = Object.keys(statements).length;
  const stmtCovered = Object.values(statements).filter(hits => hits > 0).length;
  
  const funcTotal = Object.keys(functions).length;
  const funcCovered = Object.values(functions).filter(hits => hits > 0).length;
  
  const branchTotal = Object.values(branches).flat().length;
  const branchCovered = Object.values(branches).flat().filter(hits => hits > 0).length;
  
  return {
    statements: stmtTotal > 0 ? (stmtCovered / stmtTotal) * 100 : 100,
    functions: funcTotal > 0 ? (funcCovered / funcTotal) * 100 : 100,
    branches: branchTotal > 0 ? (branchCovered / branchTotal) * 100 : 100,
    lines: stmtTotal > 0 ? (stmtCovered / stmtTotal) * 100 : 100 // Simplified
  };
}

function getUncoveredLines(data) {
  const uncovered = [];
  const { statementMap, s: statements } = data;
  
  Object.entries(statements).forEach(([stmtId, hits]) => {
    if (hits === 0 && statementMap[stmtId]) {
      const stmt = statementMap[stmtId];
      uncovered.push(`${stmt.start.line}-${stmt.end.line}`);
    }
  });
  
  return uncovered.slice(0, 10); // Limit to first 10 ranges
}

function isProductionFile(filePath) {
  // Exclude test files, polyfills, and non-production code
  const excludePatterns = [
    /\/tests?\//,
    /\.test\./,
    /\.spec\./,
    /\/polyfills\//,
    /\/factories\//,
    /playwright\.config/,
    /vitest\.config/,
    /\/main\.ts$/, // App entry point (excluded in config)
    /\/view\.ts$/, // Legacy file (excluded in config)
    /\/counter\.ts$/ // Demo file (excluded in config)
  ];
  
  return !excludePatterns.some(pattern => pattern.test(filePath));
}

function analyzeGaps(coverageData) {
  const gaps = [];
  
  Object.entries(coverageData).forEach(([filePath, data]) => {
    if (!isProductionFile(filePath)) return;
    
    const coverage = calculateCoverage(data);
    const issues = [];
    
    Object.entries(THRESHOLDS).forEach(([metric, threshold]) => {
      if (coverage[metric] < threshold) {
        issues.push({
          metric,
          current: coverage[metric],
          threshold,
          gap: threshold - coverage[metric]
        });
      }
    });
    
    if (issues.length > 0) {
      gaps.push({
        file: filePath.replace(process.cwd() + '/', ''),
        coverage,
        issues,
        uncoveredLines: getUncoveredLines(data),
        priority: issues.reduce((sum, issue) => sum + issue.gap, 0) // Higher gap = higher priority
      });
    }
  });
  
  return gaps.sort((a, b) => b.priority - a.priority);
}

function formatReport(gaps) {
  console.log('\n🔍 COVERAGE GAP ANALYSIS REPORT\n');
  console.log('=' .repeat(60));
  
  if (gaps.length === 0) {
    console.log('✅ All files meet coverage thresholds!');
    return;
  }
  
  console.log(`📊 ${gaps.length} files need additional tests\n`);
  
  // Summary stats
  const totalGap = gaps.reduce((sum, gap) => sum + gap.priority, 0);
  console.log(`📈 Total coverage debt: ${totalGap.toFixed(1)} percentage points\n`);
  
  // Top priority files
  console.log('🎯 TOP PRIORITY FILES (highest coverage debt):');
  console.log('-'.repeat(50));
  
  gaps.slice(0, 10).forEach((gap, index) => {
    const { file, coverage, issues, uncoveredLines } = gap;
    
    console.log(`\n${index + 1}. ${file}`);
    console.log(`   Priority Score: ${gap.priority.toFixed(1)}`);
    
    issues.forEach(issue => {
      const emoji = issue.metric === 'branches' ? '🌿' : 
                   issue.metric === 'functions' ? '🔧' : '📝';
      console.log(`   ${emoji} ${issue.metric}: ${issue.current.toFixed(1)}% (need ${issue.threshold}%)`);
    });
    
    if (uncoveredLines.length > 0) {
      console.log(`   📍 Uncovered lines: ${uncoveredLines.join(', ')}`);
    }
  });
  
  // Category breakdown
  console.log('\n\n📂 BY CATEGORY:');
  console.log('-'.repeat(30));
  
  const categories = gaps.reduce((acc, gap) => {
    const category = gap.file.split('/')[1] || 'root';
    if (!acc[category]) acc[category] = [];
    acc[category].push(gap);
    return acc;
  }, {});
  
  Object.entries(categories)
    .sort(([,a], [,b]) => b.length - a.length)
    .forEach(([category, files]) => {
      console.log(`\n${category}: ${files.length} files`);
      files.slice(0, 3).forEach(gap => {
        console.log(`  • ${gap.file.split('/').pop()} (${gap.priority.toFixed(1)})`);
      });
    });
  
  // Recommendations
  console.log('\n\n💡 RECOMMENDATIONS:');
  console.log('-'.repeat(40));
  
  const highImpactFiles = gaps.slice(0, 5);
  console.log('\n1. Focus on these high-impact files first:');
  highImpactFiles.forEach(gap => {
    console.log(`   • ${gap.file}`);
  });
  
  const renderingFiles = gaps.filter(g => g.file.includes('/rendering/'));
  if (renderingFiles.length > 0) {
    console.log('\n2. Rendering module needs attention:');
    console.log('   • Add tests for shapes.ts, renderer.ts, renderingEventHandler.ts');
    console.log('   • Consider integration tests for rendering pipeline');
  }
  
  const toolFiles = gaps.filter(g => g.file.includes('/tools/'));
  if (toolFiles.length > 0) {
    console.log('\n3. Tools need more comprehensive testing:');
    console.log('   • Focus on drawingTools.ts error paths');
    console.log('   • Add edge case tests for tool interactions');
  }
  
  console.log('\n4. Quick wins (add these specific test types):');
  console.log('   • Error handling paths in persistence modules');
  console.log('   • Edge cases in geometry utilities');
  console.log('   • EventBus subscription/unsubscription flows');
  console.log('   • Command registry serialization edge cases');
  
  console.log('\n🚀 Run this to start with highest priority:');
  console.log(`   npx vitest ${gaps[0].file.replace('.ts', '.spec.ts')} --coverage`);
}

function main() {
  try {
    const coverageData = loadCoverageData();
    const gaps = analyzeGaps(coverageData);
    formatReport(gaps);
    
    // Exit with error code if gaps exist (for CI)
    process.exit(gaps.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error analyzing coverage:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { analyzeGaps, calculateCoverage };
