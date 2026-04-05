# PDF Performance Test Plan

## Device Profiles

Tests should be conducted on the following device profiles to ensure optimal performance across a range of hardware:

1. **Low-end Android Device**
   - Example: Samsung Galaxy A10 or equivalent
   - RAM: 2-3GB
   - Android 9.0 or later

2. **Mid-range Android Device**
   - Example: Huawei P30 Lite or equivalent
   - RAM: 4-6GB
   - Android 10.0 or later

3. **Low-RAM iPhone**
   - Example: iPhone SE (1st gen) or iPhone 7
   - RAM: 2-3GB
   - iOS 13 or later

4. **Mid-range iPhone**
   - Example: iPhone XR or equivalent
   - RAM: 3-4GB
   - iOS 14 or later

5. **Flagship Device (Baseline)**
   - Example: Samsung Galaxy S21 or iPhone 13
   - RAM: 6GB+
   - Latest OS version

## Test Scenarios

### 1. Basic PDF Loading Performance

#### Test Steps:
1. Open a PDF document of each size category:
   - Small (1-3 pages, <1MB)
   - Medium (10-20 pages, ~5MB)
   - Large (50+ pages, >10MB)
2. Measure initial load time
3. Verify rendering quality
4. Check scroll performance (smoothness)
5. Verify memory usage

#### Acceptance Criteria:
- Initial load time should be under 3 seconds on the baseline device
- Memory usage should remain stable without noticeable leaks
- Scrolling should be smooth with no visible lag

### 2. HTML Wrapper Mode Toggle

#### Test Steps:
1. Load a medium-sized PDF document
2. Toggle between direct and HTML wrapper modes
3. Verify successful mode switch
4. Compare rendering and scrolling performance in each mode
5. Measure memory usage in each mode

#### Acceptance Criteria:
- Mode toggle should work without errors or crashes
- HTML wrapper mode should show improved memory efficiency
- No visible glitches during mode switching

### 3. Background/Foreground Behavior

#### Test Steps:
1. Open a large PDF document
2. Send app to background (press home button)
3. Keep in background for 1 minute
4. Return to the app
5. Check if PDF is still properly displayed
6. Monitor memory usage before/after background cycle

#### Acceptance Criteria:
- App should properly release memory when in background
- PDF should be restored correctly when returning to the app
- No crashes or excessive reloading

### 4. Multiple PDF Cycling

#### Test Steps:
1. Open PDF document #1 (medium size)
2. Navigate to document list
3. Open PDF document #2 (different size)
4. Repeat for 5 different PDF documents
5. Navigate back through the previously opened documents

#### Acceptance Criteria:
- No crashes after cycling through multiple PDFs
- Memory usage should remain stable or show proper cleanup
- Subsequent loads of previously viewed PDFs should be faster due to caching

### 5. Offline Caching Performance

#### Test Steps:
1. With internet connection, open a PDF document
2. Enable airplane mode
3. Close and reopen the app
4. Attempt to open the same PDF document
5. Measure load time from cache vs. original load time

#### Acceptance Criteria:
- PDF should load successfully from cache when offline
- Cache hit should reduce load time by at least 50%
- Cached PDFs should maintain rendering quality

### 6. Multilingual PDF Translation Test

#### Test Steps:
1. Open a PDF document with text in English
2. Initiate translation to one of the 11 South African languages
3. Measure translation processing time
4. Verify translated text quality
5. Check memory usage during and after translation
6. Toggle between original and translated versions

#### Acceptance Criteria:
- Translation should complete within 30 seconds for a 10-page document
- Translated text should maintain proper formatting
- No excessive memory usage during translation process
- Toggle between original and translated versions should be smooth

## Performance Measurement

### Metrics to Capture:
1. Time to first render (ms)
2. Time to interactive (ms)
3. Memory usage (MB)
4. Peak memory usage (MB)
5. Frame rate during scrolling (fps)
6. Battery impact (% per minute)

### Tools:
- React Native Performance library
- Device native profiling tools
- Chrome DevTools for WebView analysis

## Automated Performance Test Script

Place the following script in `mobile/test/pdf-performance-test.js`:

```javascript
import { PerformanceObserver, performance } from 'react-native-performance';

class PdfPerformanceTest {
  constructor() {
    this.metrics = {
      loadTime: 0,
      memoryBefore: 0,
      memoryAfter: 0,
      peakMemory: 0,
    };
    
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      for (const entry of entries) {
        console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
      }
    });
    
    this.observer.observe({ entryTypes: ['measure'] });
  }
  
  startTest(testName) {
    console.log(`Starting test: ${testName}`);
    this.memoryBefore = performance.memory?.usedJSHeapSize || 0;
    performance.mark(`${testName}-start`);
  }
  
  endTest(testName) {
    performance.mark(`${testName}-end`);
    performance.measure(testName, `${testName}-start`, `${testName}-end`);
    this.memoryAfter = performance.memory?.usedJSHeapSize || 0;
    this.metrics.loadTime = performance.getEntriesByName(testName)[0].duration;
    this.metrics.memoryUsage = this.memoryAfter - this.memoryBefore;
    
    console.log(`Test ${testName} completed`);
    console.log(`Load time: ${this.metrics.loadTime}ms`);
    console.log(`Memory impact: ${this.metrics.memoryUsage} bytes`);
    
    if (this.metrics.loadTime > 3000) {
      console.error(`PERFORMANCE FAILURE: Load time exceeds 3 seconds threshold`);
    }
    
    if (this.metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      console.error(`MEMORY USAGE FAILURE: Memory impact exceeds 50MB threshold`);
    }
    
    return this.metrics;
  }
  
  cleanup() {
    this.observer.disconnect();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

export default PdfPerformanceTest;
```

## Manual QA Checklist

### PDF Caching
- [ ] Initial PDF load shows expected loading indicators
- [ ] Repeat viewing of same PDF is significantly faster
- [ ] Verify cache hit by checking logs or network activity
- [ ] Cached PDF appears identical to original

### Memory Management
- [ ] App remains stable after viewing multiple PDFs
- [ ] Memory usage doesn't grow unbounded over time
- [ ] Background/foreground transitions properly release/restore memory
- [ ] No crashes on memory-constrained devices

### User Experience
- [ ] Loading indicators display correctly
- [ ] Mode toggle button works without glitches
- [ ] PDF rendering quality is consistent in both modes
- [ ] Error states display appropriate messages with retry options

### Multilingual Support
- [ ] Translation UI shows all 11 South African languages
- [ ] User language preference affects default translation target
- [ ] Translation status indicators work correctly
- [ ] Switching between original and translated versions works smoothly

## Test Reporting

Document test results in the following format:

| Test Case | Device | Mode | Result | Load Time | Memory Usage | Notes |
|-----------|--------|------|--------|-----------|--------------|-------|
| Basic Loading - Small PDF | iPhone SE | Direct | Pass/Fail | 1.2s | 15MB | |
| ... | ... | ... | ... | ... | ... | ... |

## Issue Classification

Categorize any discovered issues as:

1. **Critical**: Crashes, data loss, or unusable features
2. **Major**: Significant performance degradation or visual defects
3. **Minor**: Cosmetic issues or edge-case behaviors
4. **Enhancement**: Suggestions for future improvement

Include screenshots, device logs, and reproduction steps for all reported issues.
