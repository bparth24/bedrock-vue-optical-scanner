<template>
  <div class="results-display-container">
    <!-- Header Section -->
    <div class="results-header">
      <h3 class="results-title">
        <span class="results-icon">📋</span>
        Scan Results
        <span v-if="results.length > 0" class="results-count">({{ results.length }})</span>
      </h3>
      
      <!-- Header Controls -->
      <div class="header-controls">
        <!-- Format Selector -->
        <div class="format-selector">
          <label for="display-format">View:</label>
          <select 
            id="display-format"
            v-model="currentFormat"
            class="format-select">
            <option value="simple">Simple</option>
            <option value="detailed">Detailed</option>
            <option value="raw">Raw Data</option>
          </select>
        </div>
        
        <!-- Action Buttons -->
        <div class="action-buttons">
          <button 
            v-if="results.length > 0"
            @click="exportResults"
            class="action-button export-button"
            title="Export Results">
            <span class="button-icon">📤</span>
            Export
          </button>
          
          <button 
            v-if="showClearButton && results.length > 0"
            @click="clearResults"
            class="action-button clear-button"
            title="Clear All Results">
            <span class="button-icon">🗑️</span>
            Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Results Content -->
    <div class="results-content">
      <!-- No Results State -->
      <div v-if="results.length === 0" class="no-results">
        <div class="no-results-icon">🔍</div>
        <div class="no-results-text">No scan results yet</div>
        <div class="no-results-hint">Scan a QR code, barcode, or document to see results here</div>
      </div>

      <!-- Results List -->
      <div v-else class="results-list">
        <div 
          v-for="(result, index) in displayedResults"
          :key="`result-${index}`"
          :class="['result-item', { 'selected': selectedIndex === index }]"
          @click="selectResult(result, index)">
          
          <!-- Result Header -->
          <div class="result-header">
            <div class="result-meta">
              <span class="result-format">{{ getFormatDisplay(result.format) }}</span>
              <span class="result-timestamp">{{ formatTimestamp(result.timestamp) }}</span>
            </div>
            <div class="result-indicator">
              {{ getResultIcon(result.format) }}
            </div>
          </div>

          <!-- Result Content Based on Format -->
          <div class="result-content">
            <!-- Simple Format -->
            <div v-if="currentFormat === 'simple'" class="simple-content">
              <div class="simple-text">{{ getSimpleText(result) }}</div>
            </div>

            <!-- Detailed Format -->
            <div v-else-if="currentFormat === 'detailed'" class="detailed-content">
              <!-- Driver License Display -->
              <div v-if="result.driverLicense" class="dl-details">
                <h4 class="dl-title">👤 Driver License Information</h4>
                <div class="dl-fields">
                  <div 
                    v-for="(field, key) in getDisplayFields(result.driverLicense)"
                    :key="key"
                    class="dl-field">
                    <span class="field-label">{{ field.description }}:</span>
                    <span class="field-value">{{ field.value }}</span>
                  </div>
                </div>
              </div>

              <!-- MRZ Display -->
              <div v-else-if="result.data && result.format === 'mrz'" class="mrz-details">
                <h4 class="mrz-title">🆔 Document Information</h4>
                <div class="mrz-fields">
                  <div v-if="result.data.firstName || result.data.lastName" class="mrz-field">
                    <span class="field-label">Name:</span>
                    <span class="field-value">{{ result.data.firstName }} {{ result.data.lastName }}</span>
                  </div>
                  <div v-if="result.data.documentNumber" class="mrz-field">
                    <span class="field-label">Document #:</span>
                    <span class="field-value">{{ result.data.documentNumber }}</span>
                  </div>
                  <div v-if="result.data.dateOfBirth" class="mrz-field">
                    <span class="field-label">Date of Birth:</span>
                    <span class="field-value">{{ result.data.dateOfBirth }}</span>
                  </div>
                  <div v-if="result.data.dateOfExpiry" class="mrz-field">
                    <span class="field-label">Expires:</span>
                    <span class="field-value">{{ result.data.dateOfExpiry }}</span>
                  </div>
                  <div v-if="result.data.nationality" class="mrz-field">
                    <span class="field-label">Nationality:</span>
                    <span class="field-value">{{ result.data.nationality }}</span>
                  </div>
                  <div v-if="result.data.issuingState" class="mrz-field">
                    <span class="field-label">Issuing State:</span>
                    <span class="field-value">{{ result.data.issuingState }}</span>
                  </div>
                  
                  <!-- Validation Info -->
                  <div v-if="result.data.validation" class="validation-info">
                    <h5 class="validation-title">✅ Validation</h5>
                    <div class="validation-fields">
                      <div class="validation-field">
                        <span class="field-label">Status:</span>
                        <span class="field-value">{{ result.data.validation.overallStatus?.toUpperCase() }}</span>
                      </div>
                      <div class="validation-field">
                        <span class="field-label">Completeness:</span>
                        <span class="field-value">{{ result.data.validation.statistics?.overallCompleteness }}%</span>
                      </div>
                      <div class="validation-field">
                        <span class="field-label">Valid Fields:</span>
                        <span class="field-value">{{ result.data.validation.statistics?.validFields }}/{{ result.data.validation.statistics?.totalFields }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Standard Barcode Display -->
              <div v-else class="standard-details">
                <h4 class="standard-title">📄 Content</h4>
                <div class="standard-text">{{ result.text }}</div>
              </div>
            </div>

            <!-- Raw Format -->
            <div v-else-if="currentFormat === 'raw'" class="raw-content">
              <pre class="raw-text">{{ formatRawData(result) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Results Footer -->
    <div v-if="results.length > maxResults" class="results-footer">
      <div class="pagination-info">
        Showing {{ maxResults }} of {{ results.length }} results
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { ref, computed, watch } from 'vue';

export default {
  name: 'ResultsDisplayComponent',
  props: {
    results: {
      type: Array,
      default: () => []
    },
    dlInfo: {
      type: Object,
      default: null
    },
    format: {
      type: String,
      default: 'detailed',
      validator: (value) => ['simple', 'detailed', 'raw'].includes(value)
    },
    showClearButton: {
      type: Boolean,
      default: true
    },
    maxResults: {
      type: Number,
      default: 10
    }
  },
  emits: [
    'result-selected',
    'clear-results',
    'export-requested'
  ],
  setup(props, { emit, expose }) {
    // Step 1: Reactive state
    const currentFormat = ref(props.format);
    const selectedIndex = ref(null);
    
    // Step 2: Computed properties
    const displayedResults = computed(() => {
      const resultsToShow = props.results.slice(0, props.maxResults);
      
      // Add timestamps if not present
      return resultsToShow.map((result, index) => ({
        ...result,
        timestamp: result.timestamp || Date.now() - (resultsToShow.length - index) * 1000
      }));
    });
    
    // Step 3: Watchers
    watch(() => props.format, (newFormat) => {
      currentFormat.value = newFormat;
    });
    
    // Step 4: Event handlers
    function selectResult(result, index) {
      selectedIndex.value = index;
      emit('result-selected', { result, index });
    }
    
    function clearResults() {
      selectedIndex.value = null;
      emit('clear-results');
    }
    
    function exportResults() {
      const exportData = {
        results: props.results,
        format: currentFormat.value,
        exportedAt: new Date().toISOString()
      };
      
      emit('export-requested', exportData);
    }
    
    // Step 5: Display formatting functions
    function getFormatDisplay(format) {
      const formatMap = {
        'qr_code': 'QR Code',
        'pdf417': 'PDF417',
        'pdf417_enhanced': 'PDF417 Enhanced',
        'mrz': 'MRZ',
        'code128': 'Code 128',
        'code39': 'Code 39',
        'ean13': 'EAN-13',
        'ean8': 'EAN-8',
        'upca': 'UPC-A',
        'upce': 'UPC-E'
      };
      return formatMap[format] || format?.toUpperCase() || 'Unknown';
    }
    
    function getResultIcon(format) {
      const iconMap = {
        'qr_code': '⚡',
        'pdf417': '📊',
        'pdf417_enhanced': '📊+',
        'mrz': '🆔',
        'code128': '📋',
        'code39': '📋',
        'ean13': '🏷️',
        'ean8': '🏷️',
        'upca': '🏷️',
        'upce': '🏷️'
      };
      return iconMap[format] || '📄';
    }
    
    function getSimpleText(result) {
      // For driver license, show name and license number
      if (result.driverLicense) {
        const dl = result.driverLicense;
        const firstName = dl.DAC?.value || dl.DCS?.value || '';
        const lastName = dl.DCS?.value || dl.DAC?.value || '';
        const licenseNum = dl.DAQ?.value || '';
        
        if (firstName && lastName) {
          return `${firstName} ${lastName}${licenseNum ? ` - ${licenseNum}` : ''}`;
        }
        return licenseNum || 'Driver License Data';
      }
      
      // For MRZ, show name and document number
      if (result.data && result.format === 'mrz') {
        const name = `${result.data.firstName || ''} ${result.data.lastName || ''}`.trim();
        const docNum = result.data.documentNumber || '';
        return name || docNum || 'Document Data';
      }
      
      // For standard barcodes, show first 50 characters
      const text = result.text || '';
      return text.length > 50 ? `${text.substring(0, 50)}...` : text;
    }
    
    function getDisplayFields(driverLicense) {
      if (!driverLicense) return {};
      
      // Filter out raw data and empty values, then sort by importance
      const fields = {};
      const importantFields = ['DAC', 'DCS', 'DAQ', 'DBB', 'DBC', 'DBA', 'DAG', 'DAI', 'DAJ', 'DAK'];
      
      // Add important fields first
      importantFields.forEach(key => {
        if (driverLicense[key] && driverLicense[key].value) {
          fields[key] = driverLicense[key];
        }
      });
      
      // Add remaining fields
      Object.keys(driverLicense).forEach(key => {
        if (key !== 'raw' && !importantFields.includes(key) && driverLicense[key]?.value) {
          fields[key] = driverLicense[key];
        }
      });
      
      return fields;
    }
    
    function formatTimestamp(timestamp) {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      if (diff < 60000) { // Less than 1 minute
        return 'Just now';
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
      } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
      } else {
        return date.toLocaleDateString();
      }
    }
    
    function formatRawData(result) {
      return JSON.stringify(result, null, 2);
    }
    
    // Step 6: Exposed methods
    function clearResultsExposed() {
      clearResults();
    }
    
    function exportResultsExposed(format = 'json') {
      if (format === 'json') {
        return JSON.stringify(props.results, null, 2);
      } else if (format === 'csv') {
        return convertToCSV(props.results);
      }
      return '';
    }
    
    function convertToCSV(results) {
      if (results.length === 0) return '';
      
      const headers = ['Format', 'Text', 'Timestamp'];
      const rows = results.map(result => [
        result.format || '',
        (result.text || '').replace(/"/g, '""'),
        new Date(result.timestamp).toISOString()
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');
      
      return csvContent;
    }
    
    // Step 7: Expose methods for parent components
    expose({
      clearResults: clearResultsExposed,
      exportResults: exportResultsExposed
    });
    
    // Step 8: Return reactive state and methods for template
    return {
      currentFormat,
      selectedIndex,
      displayedResults,
      selectResult,
      clearResults,
      exportResults,
      getFormatDisplay,
      getResultIcon,
      getSimpleText,
      getDisplayFields,
      formatTimestamp,
      formatRawData
    };
  }
};
</script>

<style scoped>
.results-display-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Header Section */
.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
}

.results-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.results-icon {
  font-size: 20px;
}

.results-count {
  font-size: 14px;
  font-weight: 400;
  color: #666;
}

.header-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.format-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.format-selector label {
  color: #666;
  font-weight: 500;
}

.format-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  font-size: 14px;
  cursor: pointer;
}

.format-select:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.export-button {
  border-color: #28a745;
  color: #28a745;
}

.export-button:hover {
  background: #28a745;
  color: white;
}

.clear-button {
  border-color: #dc3545;
  color: #dc3545;
}

.clear-button:hover {
  background: #dc3545;
  color: white;
}

.button-icon {
  font-size: 14px;
}

/* Results Content */
.results-content {
  max-height: 600px;
  overflow-y: auto;
}

.no-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #666;
  text-align: center;
}

.no-results-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.no-results-text {
  font-size: 18px;
  font-weight: 500;
  margin-bottom: 8px;
}

.no-results-hint {
  font-size: 14px;
  opacity: 0.7;
}

/* Results List */
.results-list {
  padding: 0;
}

.result-item {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.result-item:hover {
  background: #f8f9fa;
}

.result-item.selected {
  background: #e3f2fd;
  border-left: 4px solid #007bff;
}

.result-item:last-child {
  border-bottom: none;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.result-format {
  font-weight: 600;
  color: #007bff;
  font-size: 14px;
}

.result-timestamp {
  font-size: 12px;
  color: #666;
}

.result-indicator {
  font-size: 18px;
}

/* Result Content Formats */
.result-content {
  line-height: 1.5;
}

/* Simple Format */
.simple-content {
  padding: 8px 0;
}

.simple-text {
  font-size: 16px;
  color: #333;
  word-break: break-word;
}

/* Detailed Format */
.detailed-content {
  padding: 8px 0;
}

.dl-title,
.mrz-title,
.standard-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.dl-fields,
.mrz-fields {
  display: grid;
  gap: 8px;
}

.dl-field,
.mrz-field {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.dl-field:last-child,
.mrz-field:last-child {
  border-bottom: none;
}

.field-label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.field-value {
  color: #333;
  font-size: 14px;
  word-break: break-word;
}

.validation-info {
  margin-top: 16px;
  padding: 12px;
  background: #f0f8f0;
  border-radius: 6px;
  border: 1px solid #d4edda;
}

.validation-title {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: #155724;
}

.validation-fields {
  display: grid;
  gap: 4px;
}

.validation-field {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  font-size: 13px;
}

.standard-text {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-family: monospace;
  font-size: 14px;
  color: #333;
  word-break: break-all;
  white-space: pre-wrap;
}

/* Raw Format */
.raw-content {
  padding: 8px 0;
}

.raw-text {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  color: #333;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

/* Results Footer */
.results-footer {
  padding: 12px 20px;
  background: #f8f9fa;
  border-top: 1px solid #e0e0e0;
  text-align: center;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

/* Responsive Design */
@media (max-width: 768px) {
  .results-header {
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
  }

  .header-controls {
    justify-content: space-between;
  }

  .action-buttons {
    gap: 6px;
  }

  .action-button {
    padding: 6px 10px;
    font-size: 13px;
  }

  .dl-field,
  .mrz-field {
    grid-template-columns: 1fr;
    gap: 4px;
  }

  .validation-field {
    grid-template-columns: 1fr;
    gap: 2px;
  }

  .result-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .results-display-container {
    background: #1a1a1a;
    border-color: #404040;
    color: #e0e0e0;
  }

  .results-header {
    background: #2d2d2d;
    border-color: #404040;
  }

  .results-title {
    color: #e0e0e0;
  }

  .format-select {
    background: #333;
    border-color: #555;
    color: #e0e0e0;
  }

  .action-button {
    background: #333;
    color: #e0e0e0;
  }

  .result-item:hover {
    background: #2d2d2d;
  }

  .result-item.selected {
    background: #1e3a5f;
    border-left-color: #4a9eff;
  }

  .standard-text,
  .raw-text {
    background: #2d2d2d;
    color: #e0e0e0;
  }

  .validation-info {
    background: #1e3d1e;
    border-color: #2d5a2d;
  }

  .validation-title {
    color: #4caf50;
  }
}
</style>