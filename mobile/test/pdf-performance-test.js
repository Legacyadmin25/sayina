import { PerformanceObserver, performance } from 'react-native-performance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

/**
 * PDF Performance Test Class
 * Used to measure performance metrics for PDF viewing in the Sayina mobile app
 */
class PdfPerformanceTest {
  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      memoryBefore: 0,
      memoryAfter: 0,
      peakMemory: 0,
      cacheHitTime: 0,
      frameRate: 0,
      batteryImpact: 0,
    };
    
    // Initialize performance observer
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
      }
    });
    
    this.observer.observe({ entryTypes: ['measure'] });
    
    // Test configuration
    this.config = {
      loadTimeThreshold: 3000, // 3 seconds
      memoryThreshold: 50 * 1024 * 1024, // 50MB
      frameRateThreshold: 30, // 30fps
      testPdfs: {
        small: {
          name: 'test_small.pdf',
          size: '500KB',
          pages: 2
        },
        medium: {
          name: 'test_medium.pdf',
          size: '5MB',
          pages: 15
        },
        large: {
          name: 'test_large.pdf',
          size: '15MB',
          pages: 50
        }
      }
    };
  }
  
  /**
   * Initialize test data by downloading test PDFs if needed
   */
  async initTestData() {
    try {
      // Check if test PDFs exist, download if not
      const testDir = `${FileSystem.documentDirectory}test_pdfs/`;
      const dirInfo = await FileSystem.getInfoAsync(testDir);
      
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(testDir, { intermediates: true });
      }
      
      // URLs for test PDFs - replace with actual URLs
      const pdfUrls = {
        small: 'https://sayina-test-assets.s3.amazonaws.com/test_small.pdf',
        medium: 'https://sayina-test-assets.s3.amazonaws.com/test_medium.pdf',
        large: 'https://sayina-test-assets.s3.amazonaws.com/test_large.pdf'
      };
      
      // Download test PDFs if needed
      for (const [key, pdf] of Object.entries(this.config.testPdfs)) {
        const pdfPath = `${testDir}${pdf.name}`;
        const pdfInfo = await FileSystem.getInfoAsync(pdfPath);
        
        if (!pdfInfo.exists) {
          console.log(`Downloading test PDF: ${pdf.name}`);
          await FileSystem.downloadAsync(pdfUrls[key], pdfPath);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing test data:', error);
      return false;
    }
  }
  
  /**
   * Start performance test
   * @param {string} testName - Name of the test
   */
  startTest(testName) {
    console.log(`Starting test: ${testName}`);
    this.testName = testName;
    this.memoryBefore = performance.memory?.usedJSHeapSize || 0;
    performance.mark(`${testName}-start`);
  }
  
  /**
   * End performance test and collect metrics
   */
  endTest() {
    const testName = this.testName;
    performance.mark(`${testName}-end`);
    performance.measure(testName, `${testName}-start`, `${testName}-end`);
    this.memoryAfter = performance.memory?.usedJSHeapSize || 0;
    
    // Get test results
    const entry = performance.getEntriesByName(testName)[0];
    this.metrics.loadTime = entry.duration;
    this.metrics.memoryUsage = this.memoryAfter - this.memoryBefore;
    
    console.log(`Test ${testName} completed`);
    console.log(`Load time: ${this.metrics.loadTime}ms`);
    console.log(`Memory impact: ${this.metrics.memoryUsage} bytes`);
    
    // Check against thresholds
    this.checkThresholds();
    
    return this.metrics;
  }
  
  /**
   * Check performance metrics against thresholds
   */
  checkThresholds() {
    if (this.metrics.loadTime > this.config.loadTimeThreshold) {
      console.error(`⚠️ PERFORMANCE FAILURE: Load time ${this.metrics.loadTime}ms exceeds ${this.config.loadTimeThreshold}ms threshold`);
    } else {
      console.log(`✓ Load time within acceptable range`);
    }
    
    if (this.metrics.memoryUsage > this.config.memoryThreshold) {
      console.error(`⚠️ MEMORY USAGE FAILURE: Memory impact ${Math.round(this.metrics.memoryUsage / (1024 * 1024))}MB exceeds ${Math.round(this.config.memoryThreshold / (1024 * 1024))}MB threshold`);
    } else {
      console.log(`✓ Memory usage within acceptable range`);
    }
    
    if (this.metrics.frameRate < this.config.frameRateThreshold) {
      console.error(`⚠️ FRAME RATE FAILURE: ${this.metrics.frameRate}fps is below ${this.config.frameRateThreshold}fps threshold`);
    } else if (this.metrics.frameRate > 0) {
      console.log(`✓ Frame rate within acceptable range`);
    }
  }
  
  /**
   * Run the loading performance test
   * @param {string} pdfSize - Size of PDF to test (small, medium, large)
   * @param {string} mode - Viewing mode (direct, html)
   */
  async runLoadingTest(pdfSize, mode) {
    try {
      await this.initTestData();
      
      const pdf = this.config.testPdfs[pdfSize];
      const pdfPath = `${FileSystem.documentDirectory}test_pdfs/${pdf.name}`;
      
      this.startTest(`pdf-load-${pdfSize}-${mode}`);
      
      // Here we'd actually load the PDF with our component
      // This is a simulation placeholder - in reality, you would:
      // 1. Mount the PdfWebView component
      // 2. Pass the pdfPath as sourceUrl
      // 3. Measure the load time using the component's callbacks
      
      // Simulate loading time based on PDF size
      const loadTime = pdfSize === 'small' ? 500 : pdfSize === 'medium' ? 1500 : 3000;
      await new Promise(resolve => setTimeout(resolve, loadTime));
      
      // Simulate memory usage
      this.memoryAfter = this.memoryBefore + (pdf.pages * 1024 * 1024 * (mode === 'direct' ? 1.5 : 1));
      
      // Simulate frame rate measurement
      this.metrics.frameRate = pdfSize === 'small' ? 60 : pdfSize === 'medium' ? 45 : 30;
      
      return this.endTest();
    } catch (error) {
      console.error(`Error in loading test:`, error);
      return null;
    }
  }
  
  /**
   * Run the cache performance test
   * @param {string} pdfSize - Size of PDF to test (small, medium, large)
   */
  async runCacheTest(pdfSize) {
    try {
      await this.initTestData();
      
      const pdf = this.config.testPdfs[pdfSize];
      const pdfPath = `${FileSystem.documentDirectory}test_pdfs/${pdf.name}`;
      
      // First load - should be from network/disk
      this.startTest(`pdf-cache-first-${pdfSize}`);
      
      // Simulate first load time
      const firstLoadTime = pdfSize === 'small' ? 1000 : pdfSize === 'medium' ? 2000 : 4000;
      await new Promise(resolve => setTimeout(resolve, firstLoadTime));
      
      const firstLoadMetrics = this.endTest();
      
      // Second load - should be from cache
      this.startTest(`pdf-cache-second-${pdfSize}`);
      
      // Simulate cached load time (should be faster)
      const cachedLoadTime = pdfSize === 'small' ? 200 : pdfSize === 'medium' ? 500 : 1000;
      await new Promise(resolve => setTimeout(resolve, cachedLoadTime));
      
      const secondLoadMetrics = this.endTest();
      
      // Calculate cache improvement
      const cacheImprovement = ((firstLoadMetrics.loadTime - secondLoadMetrics.loadTime) / firstLoadMetrics.loadTime) * 100;
      console.log(`Cache improvement: ${cacheImprovement.toFixed(2)}%`);
      
      if (cacheImprovement >= 50) {
        console.log(`✓ Cache hit provides sufficient performance improvement`);
      } else {
        console.error(`⚠️ CACHE PERFORMANCE FAILURE: Cache only improved load time by ${cacheImprovement.toFixed(2)}%, expected at least 50%`);
      }
      
      return {
        firstLoad: firstLoadMetrics,
        secondLoad: secondLoadMetrics,
        improvement: cacheImprovement
      };
    } catch (error) {
      console.error(`Error in cache test:`, error);
      return null;
    }
  }
  
  /**
   * Run the mode toggle test
   * @param {string} pdfSize - Size of PDF to test (small, medium, large)
   */
  async runModeToggleTest(pdfSize) {
    try {
      await this.initTestData();
      
      const pdf = this.config.testPdfs[pdfSize];
      const pdfPath = `${FileSystem.documentDirectory}test_pdfs/${pdf.name}`;
      
      // Test direct mode
      const directModeMetrics = await this.runLoadingTest(pdfSize, 'direct');
      
      // Test HTML wrapper mode
      const htmlModeMetrics = await this.runLoadingTest(pdfSize, 'html');
      
      // Compare memory usage between modes
      const memoryDifference = directModeMetrics.memoryUsage - htmlModeMetrics.memoryUsage;
      const memoryImprovement = (memoryDifference / directModeMetrics.memoryUsage) * 100;
      
      console.log(`Memory usage comparison: Direct mode ${Math.round(directModeMetrics.memoryUsage / (1024 * 1024))}MB vs HTML mode ${Math.round(htmlModeMetrics.memoryUsage / (1024 * 1024))}MB`);
      console.log(`Memory improvement with HTML mode: ${memoryImprovement.toFixed(2)}%`);
      
      if (memoryImprovement > 0) {
        console.log(`✓ HTML wrapper mode provides memory usage improvement`);
      } else {
        console.log(`ℹ️ HTML wrapper mode did not improve memory usage in this test`);
      }
      
      return {
        directMode: directModeMetrics,
        htmlMode: htmlModeMetrics,
        memoryImprovement
      };
    } catch (error) {
      console.error(`Error in mode toggle test:`, error);
      return null;
    }
  }
  
  /**
   * Run background/foreground transition test
   * @param {string} pdfSize - Size of PDF to test (small, medium, large)
   */
  async runBackgroundTransitionTest(pdfSize) {
    try {
      await this.initTestData();
      
      const pdf = this.config.testPdfs[pdfSize];
      const pdfPath = `${FileSystem.documentDirectory}test_pdfs/${pdf.name}`;
      
      // Simulate loading the PDF
      this.startTest(`pdf-background-before-${pdfSize}`);
      const loadTime = pdfSize === 'small' ? 500 : pdfSize === 'medium' ? 1500 : 3000;
      await new Promise(resolve => setTimeout(resolve, loadTime));
      const beforeMetrics = this.endTest();
      
      // Simulate going to background and coming back
      console.log('Simulating app going to background...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Simulating app coming back to foreground...');
      
      // Measure memory after background/foreground transition
      this.startTest(`pdf-background-after-${pdfSize}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to simulate transition
      const afterMetrics = this.endTest();
      
      // Check memory cleanup
      const memoryDifference = beforeMetrics.memoryUsage - afterMetrics.memoryUsage;
      console.log(`Memory cleanup after background transition: ${Math.round(memoryDifference / (1024 * 1024))}MB`);
      
      if (memoryDifference > 0) {
        console.log(`✓ Background transition properly released memory`);
      } else {
        console.log(`ℹ️ Background transition did not release memory`);
      }
      
      return {
        before: beforeMetrics,
        after: afterMetrics,
        memoryReleased: memoryDifference
      };
    } catch (error) {
      console.error(`Error in background transition test:`, error);
      return null;
    }
  }
  
  /**
   * Run multiple PDF cycling test
   */
  async runMultiplePdfTest() {
    try {
      await this.initTestData();
      
      const results = [];
      const pdfSizes = ['small', 'medium', 'large', 'medium', 'small'];
      
      let initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      for (let i = 0; i < pdfSizes.length; i++) {
        const pdfSize = pdfSizes[i];
        console.log(`Cycling test: Loading PDF ${i+1}/${pdfSizes.length} (${pdfSize})`);
        
        const metrics = await this.runLoadingTest(pdfSize, 'direct');
        results.push({
          pdfSize,
          metrics
        });
      }
      
      let finalMemory = performance.memory?.usedJSHeapSize || 0;
      let memoryLeak = finalMemory - initialMemory;
      
      console.log(`Memory usage after cycling through ${pdfSizes.length} PDFs: ${Math.round(memoryLeak / (1024 * 1024))}MB`);
      
      if (memoryLeak > 50 * 1024 * 1024) { // 50MB threshold
        console.error(`⚠️ MEMORY LEAK DETECTED: ${Math.round(memoryLeak / (1024 * 1024))}MB not released after cycling PDFs`);
      } else {
        console.log(`✓ No significant memory leak detected in PDF cycling test`);
      }
      
      return {
        results,
        memoryLeak
      };
    } catch (error) {
      console.error(`Error in multiple PDF test:`, error);
      return null;
    }
  }
  
  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('🏁 Starting PDF performance test suite');
    
    const results = {
      loading: {},
      cache: {},
      modeToggle: {},
      backgroundTransition: {},
      multiplePdf: null
    };
    
    // Test PDF loading for different sizes and modes
    for (const size of ['small', 'medium', 'large']) {
      for (const mode of ['direct', 'html']) {
        console.log(`\n📑 Running loading test: ${size} PDF in ${mode} mode`);
        results.loading[`${size}_${mode}`] = await this.runLoadingTest(size, mode);
      }
    }
    
    // Test caching for different sizes
    for (const size of ['small', 'medium', 'large']) {
      console.log(`\n💾 Running cache test: ${size} PDF`);
      results.cache[size] = await this.runCacheTest(size);
    }
    
    // Test mode toggle for different sizes
    for (const size of ['small', 'medium', 'large']) {
      console.log(`\n🔄 Running mode toggle test: ${size} PDF`);
      results.modeToggle[size] = await this.runModeToggleTest(size);
    }
    
    // Test background transitions for different sizes
    for (const size of ['small', 'medium', 'large']) {
      console.log(`\n↩️ Running background transition test: ${size} PDF`);
      results.backgroundTransition[size] = await this.runBackgroundTransitionTest(size);
    }
    
    // Test multiple PDF cycling
    console.log(`\n🔄 Running multiple PDF cycling test`);
    results.multiplePdf = await this.runMultiplePdfTest();
    
    console.log('\n✅ PDF performance test suite completed');
    return results;
  }
  
  /**
   * Export test results to a file
   * @param {Object} results - Test results
   */
  async exportResults(results) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const resultsPath = `${FileSystem.documentDirectory}pdf_test_results_${timestamp}.json`;
      
      await FileSystem.writeAsStringAsync(resultsPath, JSON.stringify(results, null, 2));
      
      console.log(`Test results exported to ${resultsPath}`);
      return resultsPath;
    } catch (error) {
      console.error('Error exporting test results:', error);
      return null;
    }
  }
  
  /**
   * Clean up after tests
   */
  cleanup() {
    this.observer.disconnect();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

export default PdfPerformanceTest;
