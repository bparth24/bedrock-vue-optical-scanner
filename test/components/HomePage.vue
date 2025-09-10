<template>
  <div class="test-page">
    <div class="test-header">
      <h1>🔍 OpticalScanner Test Page</h1>
      <p>Testing @bedrock/vue-optical-scanner components</p>
    </div>

    <!-- Test Status -->
    <div class="test-status" :class="statusClass">
      {{ testStatus }}
    </div>

    <!-- Main OpticalScanner Test -->
    <div class="test-section">
      <h2>📱 Primary OpticalScanner Test</h2>
      <div class="scanner-wrapper">
        <OpticalScanner 
          :formats="selectedFormats"
          :mode="selectedMode"
          :continuous-scanning="continuousMode"
          :tip-text="tipText"
          @result="handleResult"
          @error="handleError"
          @camera-ready="handleCameraReady"
          @camera-error="handleCameraError"
          @scanning="handleScanning"
        />
      </div>
    </div>

    <!-- Test Configuration -->
    <div class="test-config">
      <h3>⚙️ Test Configuration</h3>
      
      <!-- Format Selection -->
      <div class="config-group">
        <label>Formats to Test:</label>
        <div class="checkbox-group">
          <label v-for="format in availableFormats" :key="format">
            <input
              type="checkbox"
              :value="format"
              v-model="selectedFormats">
            {{ formatLabels[format] }}
          </label>
        </div>
      </div>

      <!-- Mode Selection -->
      <div class="config-group">
        <label>Scanning Mode:</label>
        <select v-model="selectedMode" class="select-input">
          <option value="first">First Match</option>
          <option value="all">All Formats</option>
          <option value="exhaustive">Exhaustive</option>
        </select>
      </div>

      <!-- Continuous Scanning -->
      <div class="config-group">
        <label>
          <input 
            type="checkbox" 
            v-model="continuousMode">
          Continuous Scanning
        </label>
      </div>

      <!-- Tip Text -->
      <div class="config-group">
        <label>Tip Text:</label>
        <input 
          type="text" 
          v-model="tipText" 
          placeholder="Enter custom tip text"
          class="text-input">
      </div>
    </div>

    <!-- Test Results -->
    <div v-if="testResults.length > 0" class="test-results">
      <h3>📊 Test Results History</h3>
      <div class="results-list">
        <div 
          v-for="(result, index) in testResults" 
          :key="index"
          class="result-entry">
          <div class="result-timestamp">
            {{ result.timestamp }}
          </div>
          <div class="result-data">
            <strong>{{ result.type }}:</strong>
            <pre>{{ JSON.stringify(result.data, null, 2) }}</pre>
          </div>
        </div>
      </div>
      
      <!-- Clear Results -->
      <button @click="clearResults" class="clear-button">
        Clear Results
      </button>
    </div>

    <!-- Test Errors -->
    <div v-if="testErrors.length > 0" class="test-errors">
      <h3>❌ Test Errors</h3>
      <div class="errors-list">
        <div 
          v-for="(error, index) in testErrors" 
          :key="index"
          class="error-entry">
          <div class="error-timestamp">
            {{ error.timestamp }}
          </div>
          <div class="error-message">
            {{ error.message }}
          </div>
        </div>
      </div>
      
      <!-- Clear Errors -->
      <button @click="clearErrors" class="clear-button">
        Clear Errors
      </button>
    </div>

    <!-- Debug Info -->
    <div class="debug-info">
      <h3>🛠️ Debug Information</h3>
      <div class="debug-grid">
        <div class="debug-item">
          <strong>Camera Active:</strong> {{ cameraStatus.active }}
        </div>
        <div class="debug-item">
          <strong>Loading:</strong> {{ cameraStatus.loading }}
        </div>
        <div class="debug-item">
          <strong>Current Error:</strong> {{ cameraStatus.error || 'None' }}
        </div>
        <div class="debug-item">
          <strong>Scanning:</strong> {{ scanStatus.active }}
        </div>
        <div class="debug-item">
          <strong>Selected Formats:</strong> {{ selectedFormats.join(', ') }}
        </div>
        <div class="debug-item">
          <strong>Scanning Mode:</strong> {{ selectedMode }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { ref, reactive } from 'vue';
import { OpticalScanner } from '@bedrock/vue-optical-scanner';

// Test configuration
const availableFormats = ['qr_code', 'pdf417', 'mrz'];
const formatLabels = {
  qr_code: 'QR Code',
  pdf417: 'PDF417',
  mrz: 'MRZ'
};

// Reactive state
const selectedFormats = ref(['qr_code', 'pdf417']);
const selectedMode = ref('first');
const continuousMode = ref(false);
const tipText = ref('Point camera at barcode and click Scan Now');

const testStatus = ref('Ready to test');
const testResults = ref([]);
const testErrors = ref([]);

const cameraStatus = reactive({
  active: false,
  loading: false,
  error: null
});

const scanStatus = reactive({
  active: false
});

// Computed
const statusClass = ref('status-ready');

// Event handlers
const handleResult = (results) => {
  console.log('📷 Scan results received:', results);
  
  testResults.value.unshift({
    timestamp: new Date().toLocaleTimeString(),
    type: 'SUCCESS',
    data: results
  });
  
  testStatus.value = `✅ Scan successful! Found ${results.length} result(s)`;
  statusClass.value = 'status-success';
  
  // Reset status after 3 seconds
  setTimeout(() => {
    testStatus.value = 'Ready to test';
    statusClass.value = 'status-ready';
  }, 3000);
};

const handleError = (error) => {
  console.error('❌ Scan error:', error);
  
  testErrors.value.unshift({
    timestamp: new Date().toLocaleTimeString(),
    message: typeof error === 'string' ? error : error.message || 'Unknown error'
  });
  
  testStatus.value = `❌ Scan failed: ${typeof error === 'string' ? error : error.message}`;
  statusClass.value = 'status-error';
  
  // Reset status after 5 seconds
  setTimeout(() => {
    testStatus.value = 'Ready to test';
    statusClass.value = 'status-ready';
  }, 5000);
};

const handleCameraReady = () => {
  console.log('📹 Camera ready');
  cameraStatus.active = true;
  cameraStatus.loading = false;
  cameraStatus.error = null;
  
  testStatus.value = 'Camera ready - click Scan Now to test';
  statusClass.value = 'status-ready';
};

const handleCameraError = (error) => {
  console.error('📹 Camera error:', error);
  cameraStatus.active = false;
  cameraStatus.loading = false;
  cameraStatus.error = error.message || 'Camera access failed';
  
  testStatus.value = `Camera error: ${error.message || 'Unknown camera error'}`;
  statusClass.value = 'status-error';
};

const handleScanning = (isScanning) => {
  console.log('🔍 Scanning state:', isScanning);
  scanStatus.active = isScanning;
  
  if (isScanning) {
    testStatus.value = 'Scanning in progress...';
    statusClass.value = 'status-scanning';
  }
};

// Utility functions
const clearResults = () => {
  testResults.value = [];
};

const clearErrors = () => {
  testErrors.value = [];
};
</script>

<style scoped>
.test-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.test-header {
  text-align: center;
  margin-bottom: 30px;
}

.test-header h1 {
  color: #1f2937;
  margin-bottom: 8px;
}

.test-header p {
  color: #6b7280;
  margin: 0;
}

.test-status {
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 6px;
  text-align: center;
  font-weight: 500;
}

.status-ready {
  background: #dbeafe;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.status-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.status-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.status-scanning {
  background: #fef3c7;
  color: #d97706;
  border: 1px solid #fcd34d;
}

.test-section {
  margin-bottom: 40px;
}

.test-section h2 {
  color: #374151;
  margin-bottom: 16px;
}

.scanner-wrapper {
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  background: #f9fafb;
}

.test-config {
  background: #f3f4f6;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 30px;
}

.test-config h3 {
  margin-top: 0;
  color: #374151;
}

.config-group {
  margin-bottom: 16px;
}

.config-group label {
  display: block;
  margin-bottom: 4px;
  font-weight: 500;
  color: #374151;
}

.checkbox-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

.select-input,
.text-input {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  font-size: 14px;
}

.select-input {
  min-width: 150px;
}

.text-input {
  width: 100%;
  max-width: 300px;
}

.test-results,
.test-errors {
  margin-bottom: 30px;
  padding: 16px;
  border-radius: 8px;
}

.test-results {
  background: #ecfdf5;
  border: 1px solid #d1fae5;
}

.test-errors {
  background: #fef2f2;
  border: 1px solid #fecaca;
}

.test-results h3 {
  color: #065f46;
  margin-top: 0;
}

.test-errors h3 {
  color: #dc2626;
  margin-top: 0;
}

.results-list,
.errors-list {
  max-height: 400px;
  overflow-y: auto;
}

.result-entry,
.error-entry {
  background: white;
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 4px;
  border-left: 4px solid #10b981;
}

.error-entry {
  border-left-color: #ef4444;
}

.result-timestamp,
.error-timestamp {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.result-data pre {
  background: #f3f4f6;
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
  margin: 8px 0 0 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.error-message {
  color: #dc2626;
  font-weight: 500;
}

.clear-button {
  padding: 8px 16px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.clear-button:hover {
  background: #4b5563;
}

.debug-info {
  background: #f8fafc;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.debug-info h3 {
  margin-top: 0;
  color: #475569;
}

.debug-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 12px;
}

.debug-item {
  padding: 8px;
  background: white;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

.debug-item strong {
  color: #475569;
}

/* Responsive */
@media (max-width: 640px) {
  .test-page {
    padding: 12px;
  }
  
  .scanner-wrapper {
    padding: 12px;
  }
  
  .checkbox-group {
    flex-direction: column;
  }
  
  .debug-grid {
    grid-template-columns: 1fr;
  }
}
</style>
