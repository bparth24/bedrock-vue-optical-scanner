<template>
  <div class="optical-scanner">
    <!-- Main Camera Container -->
    <div class="camera-container">
      <!-- Video Stream -->
      <video
        ref="videoElement"
        autoplay
        playsinline
        muted
        class="camera-video"
        :class="{ 'camera-active': cameraActive }"
      />
      
      <!-- Loading Overlay -->
      <div
        v-if="loadingCamera"
        class="overlay loading-overlay">
        <div class="loading-content">
          <div class="spinner" />
          <div class="loading-text">Loading Camera...</div>
        </div>
      </div>
      
      <!-- Error Overlay -->
      <div
        v-if="cameraError"
        class="overlay error-overlay">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-text">{{ cameraError }}</div>
          <button @click="retryCamera" class="retry-button">
            Retry Camera
          </button>
        </div>
      </div>
      
      <!-- Scanning Overlay -->
      <div
        v-if="scanning"
        class="overlay scanning-overlay">
        <div class="scanning-content">
          <div class="scanning-indicator" />
          <div class="scanning-text">Scanning...</div>
        </div>
      </div>
    </div>
    
    <!-- Basic Controls -->
    <div class="controls-container">
      <!-- Camera Controls -->
      <div class="camera-controls">
        <button
          @click="toggleCamera"
          :disabled="loadingCamera"
          class="control-button">
          {{ cameraActive ? 'Stop Camera' : 'Start Camera' }}
        </button>
        
        <button
          @click="triggerScan"
          :disabled="!cameraActive || scanning"
          class="control-button scan-button">
          {{ scanning ? 'Scanning...' : 'Scan Now' }}
        </button>
      </div>
      
      <!-- Format Selection -->
      <div class="format-selection">
        <label>Formats:</label>
        <div class="format-checkboxes">
          <label v-for="format in availableFormats" :key="format">
            <input
              type="checkbox"
              :value="format"
              v-model="selectedFormats"
              :disabled="scanning">
            {{ formatLabels[format] }}
          </label>
        </div>
      </div>
    </div>
    
    <!-- Results Display -->
    <div v-if="results.length > 0" class="results-container">
      <h3>Scan Results:</h3>
      <div v-for="(result, index) in results" :key="index" class="result-item">
        <strong>{{ result.format }}:</strong> {{ result.text }}
      </div>
    </div>
  </div>
</template>

<script setup>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { 
  OpticalScanner,
  qrCodePlugin,
  pdf417Plugin,
  enhancedPdf417Plugin,
  mrzPlugin,
  cameraUtils
} from '@bedrock/web-optical-scanner';

// Props
const props = defineProps({
  formats: {
    type: Array,
    default: () => ['qr_code']
  },
  mode: {
    type: String,
    default: 'first',
    validator: (value) => ['first', 'all', 'exhaustive'].includes(value)
  },
  continuousScanning: {
    type: Boolean,
    default: false
  },
  tipText: {
    type: String,
    default: ''
  }
});

// Events
const emit = defineEmits([
  'result',
  'error', 
  'close',
  'camera-ready',
  'camera-error',
  'scanning'
]);

// Available formats and labels
const availableFormats = ['qr_code', 'pdf417', 'pdf417_enhanced', 'mrz'];
const formatLabels = {
  qr_code: 'QR Code',
  pdf417: 'PDF417',
  enhancedPdf417: 'PDF417 Enhanced',
  mrz: 'MRZ'
};

// Reactive state
const videoElement = ref(null);
const cameraActive = ref(false);
const loadingCamera = ref(false);
const cameraError = ref(null);
const scanning = ref(false);
const selectedFormats = ref([...props.formats]);
const results = ref([]);

// Scanner and stream
let scanner = null;
let videoStream = null;

// Initialize scanner with plugins
const initializeScanner = () => {
  const plugins = [];
  
  if(selectedFormats.value.includes('qr_code')) {
    plugins.push(qrCodePlugin);
  }
  if(selectedFormats.value.includes('pdf417')) {
    plugins.push(pdf417Plugin);
  }
  if(selectedFormats.value.includes('pdf417_enhanced')) {
    plugins.push(enhancedPdf417Plugin);
  }
  if(selectedFormats.value.includes('mrz')) {
    plugins.push(mrzPlugin);
  }
  
  scanner = new OpticalScanner({ plugins });
};

// Camera management
const startCamera = async () => {
  if (cameraActive.value) return;
  
  loadingCamera.value = true;
  cameraError.value = null;
  
  try {
    // Get camera constraints
    const constraints = cameraUtils.getDefaultConstraints({
      video: {
        facingMode: 'environment', // Back camera preferred
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });
    
    // Start camera stream
    videoStream = await cameraUtils.startCameraStream(constraints);
    
    // Attach to video element
    if (videoElement.value) {
      videoElement.value.srcObject = videoStream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
        videoElement.value.onloadedmetadata = resolve;
      });
      
      cameraActive.value = true;
      emit('camera-ready');
      
      // Start continuous scanning if enabled
      if (props.continuousScanning) {
        startContinuousScanning();
      }
    }
  } catch (error) {
    console.error('Camera start error:', error);
    cameraError.value = getCameraErrorMessage(error);
    emit('camera-error', error);
  } finally {
    loadingCamera.value = false;
  }
};

const stopCamera = () => {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
  
  if (videoElement.value) {
    videoElement.value.srcObject = null;
  }
  
  cameraActive.value = false;
  scanning.value = false;
};

const toggleCamera = () => {
  if (cameraActive.value) {
    stopCamera();
  } else {
    startCamera();
  }
};

const retryCamera = () => {
  cameraError.value = null;
  startCamera();
};

// Scanning logic
const triggerScan = async () => {
  if (!cameraActive.value || scanning.value || !scanner) return;
  
  scanning.value = true;
  emit('scanning', true);
  
  try {
    // Capture current frame from video
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = videoElement.value.videoWidth;
    canvas.height = videoElement.value.videoHeight;
    
    ctx.drawImage(videoElement.value, 0, 0);
    
    // Convert to blob for scanning
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8);
    });
    
    // Scan the captured frame
    const scanResults = await scanner.scan(blob, {
      formats: selectedFormats.value,
      mode: props.mode
    });
    
    if (scanResults && scanResults.length > 0) {
      results.value = scanResults;
      emit('result', scanResults);
    } else {
      emit('error', 'No results found');
    }
    
  } catch (error) {
    console.error('Scanning error:', error);
    emit('error', error.message || 'Scanning failed');
  } finally {
    scanning.value = false;
    emit('scanning', false);
  }
};

// Continuous scanning (for future enhancement)
let continuousScanInterval = null;

const startContinuousScanning = () => {
  if (continuousScanInterval) return;
  
  continuousScanInterval = setInterval(() => {
    if (cameraActive.value && !scanning.value) {
      triggerScan();
    }
  }, 1000); // Scan every second
};

const stopContinuousScanning = () => {
  if (continuousScanInterval) {
    clearInterval(continuousScanInterval);
    continuousScanInterval = null;
  }
};

// Utility functions
const getCameraErrorMessage = (error) => {
  if (error.name === 'NotAllowedError') {
    return 'Camera access denied. Please allow camera permissions.';
  }
  if (error.name === 'NotFoundError') {
    return 'No camera found on this device.';
  }
  if (error.name === 'NotReadableError') {
    return 'Camera is already in use by another application.';
  }
  return 'Camera access failed. Please try again.';
};

// Watch for format changes
watch(selectedFormats, () => {
  initializeScanner();
}, { deep: true });

// Lifecycle hooks
onMounted(() => {
  initializeScanner();
  startCamera();
});

onUnmounted(() => {
  stopCamera();
  stopContinuousScanning();
});
</script>

<style scoped>
.optical-scanner {
  max-width: 100%;
  margin: 0 auto;
  font-family: Arial, sans-serif;
}

.camera-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.camera-video {
  width: 100%;
  height: auto;
  display: block;
  background: #000;
  transition: opacity 0.3s ease;
}

.camera-video:not(.camera-active) {
  opacity: 0.5;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.loading-overlay {
  background: rgba(0, 0, 0, 0.8);
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid #fff;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-overlay {
  background: rgba(220, 38, 38, 0.9);
}

.error-content {
  text-align: center;
  padding: 20px;
}

.error-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.retry-button {
  margin-top: 16px;
  padding: 8px 16px;
  background: #fff;
  color: #dc2626;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.retry-button:hover {
  background: #f3f4f6;
}

.scanning-overlay {
  background: rgba(34, 197, 94, 0.8);
}

.scanning-content {
  text-align: center;
}

.scanning-indicator {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top: 4px solid #fff;
  border-radius: 50%;
  margin: 0 auto 16px;
  animation: spin 0.8s linear infinite;
}

.controls-container {
  margin-top: 20px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.camera-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  justify-content: center;
}

.control-button {
  padding: 12px 24px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
}

.control-button:hover:not(:disabled) {
  background: #2563eb;
}

.control-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.scan-button {
  background: #059669;
}

.scan-button:hover:not(:disabled) {
  background: #047857;
}

.format-selection {
  text-align: center;
}

.format-selection label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #374151;
}

.format-checkboxes {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.format-checkboxes label {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-weight: normal;
  cursor: pointer;
}

.format-checkboxes input[type="checkbox"] {
  margin: 0;
}

.results-container {
  margin-top: 20px;
  padding: 16px;
  background: #ecfdf5;
  border: 1px solid #d1fae5;
  border-radius: 8px;
}

.results-container h3 {
  margin: 0 0 12px 0;
  color: #065f46;
}

.result-item {
  padding: 8px;
  margin-bottom: 8px;
  background: #f0fdf4;
  border-radius: 4px;
  word-break: break-all;
}

.result-item strong {
  color: #047857;
}

/* Responsive design */
@media (max-width: 640px) {
  .camera-controls {
    flex-direction: column;
    align-items: center;
  }
  
  .format-checkboxes {
    flex-direction: column;
    align-items: center;
  }
  
  .control-button {
    width: 100%;
    max-width: 280px;
  }
}
</style>