<template>
  <div class="optical-scanner-container">
    <!-- Main scanning area -->
    <div class="scanner-main-area">
      <!-- Camera Video Component -->
      <CameraVideoComponent
        v-if="showCamera"
        ref="cameraVideo"
        :constraints="cameraConstraints"
        :auto-start="autoStartCamera"
        @stream-ready="onCameraReady"
        @camera-error="onCameraError"
        @capabilities-detected="onCapabilitiesDetected" />

      <!-- Region Overlay (QR Box) -->
      <RegionOverlayComponent
        v-if="showCamera && showQrBox"
        :show-qr-box="showQrBox"
        :guide-color="guideColor"
        :client-width="videoSize.width"
        :client-height="videoSize.height"
        @region-calculated="onRegionCalculated" />

      <!-- Loading Overlay -->
      <LoadingOverlayComponent
        v-if="showCamera && cameraLoading"
        :message="loadingMessage" />

      <!-- Error Overlay -->
      <ErrorDisplayComponent
        v-if="showCamera && cameraError"
        :error="cameraError"
        :show-retry="true"
        @retry="retryCameraAccess" />
    </div>

    <!-- Camera Controls -->
    <CameraControlsComponent
      v-if="showCameraControls && cameraCapabilities"
      :camera-list="availableCameras"
      :capabilities="cameraCapabilities"
      :current-device="currentDeviceId"
      :torch-on="torchOn"
      :zoom-level="zoomLevel"
      @device-changed="onDeviceChanged"
      @torch-toggled="onTorchToggled"
      @zoom-changed="onZoomChanged" />

    <!-- Scanner Controls -->
    <ScannerControlsComponent
      v-if="showScannerControls"
      :formats="formatsToSupport"
      :mode="mode"
      :continuous-scanning="continuousScanning"
      :scanning="isScanning"
      @formats-changed="onFormatsChanged"
      @mode-changed="onModeChanged"
      @continuous-changed="onContinuousChanged"
      @scan-triggered="triggerManualScan" />

    <!-- Upload Component -->
    <UploadComponent
      v-if="showUpload && !hideUploadButton"
      @file-selected="onFileSelected" />

    <!-- Tip Text -->
    <TipTextComponent
      v-if="showTipText && tipText"
      :tip-text="tipText" />

    <!-- Results Display -->
    <ResultsDisplayComponent
      v-if="showResults && scanResults.length > 0"
      :results="scanResults"
      @result-selected="onResultSelected"
      @clear-results="clearResults" />

    <!-- Scanning Orchestrator (Renderless) -->
    <ScanningOrchestratorComponent
      :source="scanSource"
      :formats="formatsToSupport"
      :mode="mode"
      :continuous="continuousScanning"
      :scan-interval="scanInterval"
      :plugin-options="{
        pdf417_enhanced: { licenseKey: dynamsoft.licenseKey },
        mrz: { licenseKey: dynamsoft.licenseKey }
      }"
      @result="onScanResult"
      @error="onScanError"
      @progress="onScanProgress" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';

// Import all the modular components
import CameraControlsComponent from './core/CameraControlsComponent.vue';
import CameraVideoComponent from './core/CameraVideoComponent.vue';
import ErrorDisplayComponent from './core/ErrorDisplayComponent.vue';
import LoadingOverlayComponent from './core/LoadingOverlayComponent.vue';
import RegionOverlayComponent from './core/RegionOverlayComponent.vue';
import ResultsDisplayComponent from './core/ResultsDisplayComponent.vue';
import ScannerControlsComponent from './core/ScannerControlsComponent.vue';
import ScanningOrchestratorComponent from
  './core/ScanningOrchestratorComponent.vue';
import TipTextComponent from './core/TipTextComponent.vue';
import UploadComponent from './core/UploadComponent.vue';

export default {
  name: 'OpticalScannerComponent',

  components: {
    CameraVideoComponent,
    CameraControlsComponent,
    ErrorDisplayComponent,
    LoadingOverlayComponent,
    RegionOverlayComponent,
    ResultsDisplayComponent,
    ScannerControlsComponent,
    ScanningOrchestratorComponent,
    TipTextComponent,
    UploadComponent,
  },

  props: {
    dynamsoft: {
      type: Object,
      default: () => ({licenseKey: null})
    },
    // === Backward Compatibility Props ===
    // From bedrock-vue-barcode-scanner
    // All supported formats
    formatsToSupport: {
      type: Array,
      default: () => ['qr_code', 'pdf417', 'pdf417_enhanced', 'mrz']
    },
    tipText: {
      type: String,
      default: ''
    },
    showQrBox: {
      type: Boolean,
      default: false
    },
    torchOn: {
      type: Boolean,
      default: false
    },

    // From bedrock-vue-pdf417
    pdf417: {
      type: Object,
      default: null
    },
    guideColor: {
      type: String,
      default: 'rgb(254, 142, 20)'
    },
    hideUploadButton: {
      type: Boolean,
      default: false
    },

    // === New Optical Scanner Props ===
    mode: {
      type: String,
      default: 'first',
      validator: value => ['first', 'all', 'exhaustive'].includes(value)
    },
    continuousScanning: {
      type: Boolean,
      default: false
    },

    // === Component Visibility Props ===
    showCamera: {
      type: Boolean,
      default: true
    },
    showCameraControls: {
      type: Boolean,
      default: true
    },
    showScannerControls: {
      type: Boolean,
      default: true
    },
    showUpload: {
      type: Boolean,
      default: true
    },
    showTipText: {
      type: Boolean,
      default: true
    },
    showResults: {
      type: Boolean,
      default: true
    },
    autoStartCamera: {
      type: Boolean,
      default: true
    }
  },

  emits: [
    'result', // Backward compatible result format
    'error', // Error events
    'close', // Close/cancel events
    'camera-ready', // Camera initialization
    'camera-error', // Camera errors
    'scanning', // Scanning state changes
    'torch-changed',
    'formats-changed',
    'mode-changed',
    'continuous-changed',
    'scan-triggered',
    'file-selected',
    'result-selected'
  ],

  setup(props, {emit, expose}) {
    // === Reactive State ===
    // Camera state
    const cameraLoading = ref(false);
    const cameraError = ref(null);
    const cameraCapabilities = ref(null);
    const availableCameras = ref([]);
    const currentDeviceId = ref(null);
    const zoomLevel = ref(1);

    // Video/scanning state
    const videoSize = reactive({width: 640, height: 480});
    const scanSource = ref(null);
    const isScanning = ref(false);
    const scanResults = ref([]);
    const loadingMessage = ref('Loading camera...');

    // === Component Refs ===
    const cameraVideo = ref(null);

    // === Computed Properties ===
    const cameraConstraints = computed(() => ({
      video: {
        facingMode: 'environment', // Back camera preferred
        width: {ideal: 1280},
        height: {ideal: 720}
      }
    }));

    // === Event Handlers ===

    // Camera Events
    function onCameraReady({stream, videoElement}) {
      cameraLoading.value = false;
      cameraError.value = null;

      // Update video size for overlay calculations
      // Wait for video metadata to be fully loaded
      if(videoElement) {
        videoElement.addEventListener('loadedmetadata', () => {
          videoSize.width = videoElement.videoWidth || 640;
          videoSize.height = videoElement.videoHeight || 480;
        });
      }

      // Set scan source for orchestrator
      scanSource.value = videoElement;

      // Emit backward-compatible event
      emit('camera-ready', {stream, videoElement});
    }

    function onCameraError(error) {
      cameraLoading.value = false;
      cameraError.value = error;

      // Emit backward-compatible event
      emit('camera-error', error);
    }

    function onCapabilitiesDetected({capabilities}) {
      cameraCapabilities.value = capabilities;
    }

    // Camera Control Events
    function onDeviceChanged({deviceId}) {
      currentDeviceId.value = deviceId;
      // Restart camera with new device
      if(cameraVideo.value) {
        cameraVideo.value.stopCamera();
        cameraVideo.value.startCamera();
      }
    }

    function onTorchToggled({torchOn}) {
      // Update internal state and emit for parent
      // Note: Parent can listen to this if they want to sync their torchOn prop
      emit('torch-changed', {torchOn});
    }

    function onZoomChanged({zoomLevel: newZoomLevel}) {
      zoomLevel.value = newZoomLevel;
    }

    // Scanner Control Events
    function onFormatsChanged({formats}) {
      // Parent should update formatsToSupport prop,
      // but emit event for flexibility
      emit('formats-changed', {formats});
    }

    function onModeChanged({mode}) {
      emit('mode-changed', {mode});
    }

    function onContinuousChanged({continuous}) {
      emit('continuous-changed', {continuous});
    }

    function triggerManualScan() {
      if(scanSource.value && !isScanning.value) {
        // The ScanningOrchestratorComponent will handle the actual scan
        // We just need to ensure it has the current source
        emit('scan-triggered');
      }
    }

    // Upload Events
    function onFileSelected({file}) {
      // Set file as scan source
      scanSource.value = file;

      // Optionally emit for parent awareness
      emit('file-selected', {file});
    }

    // Scanning Orchestrator Events
    function onScanResult({results}) {
      isScanning.value = false;
      scanResults.value = results;

      // Emit backward-compatible result format
      // Transform to match existing bedrock-vue-barcode-scanner format
      const compatibleResults = results.map(result => ({
        text: result.text,
        format: result.format,
        ...result // Include any additional properties
      }));

      emit('result', compatibleResults);
      emit('scanning', false);
    }

    function onScanError({error, source, type}) {
      isScanning.value = false;

      // Emit backward-compatible error
      emit('error', {error, source, type});
      emit('scanning', false);
    }

    function onScanProgress({scanning}) {
      isScanning.value = scanning;

      // Emit scanning state change
      emit('scanning', scanning);
    }

    // Results and UI Events
    function onResultSelected(result) {
      // Could emit this for parent to handle result selection
      emit('result-selected', result);
    }

    function clearResults() {
      scanResults.value = [];
    }

    function onRegionCalculated({region}) {
      // Store region data if needed for advanced scanning
      // This could be used to focus scanning on specific areas
    }

    // === Watchers ===
    function setupWatchers() {
      // Watch for torch changes from parent
      watch(() => props.torchOn, newTorchState => {
        if(cameraVideo.value && cameraCapabilities.value?.torch) {
          // Apply torch setting to camera
          // This would typically be handled by the camera component
        }
      });

      // Watch for format changes
      watch(() => props.formatsToSupport, newFormats => {
        // The ScanningOrchestratorComponent will react to this automatically
        // via its props reactivity
      }, {deep: true});
    }

    // === Utility Methods ===
    function retryCameraAccess() {
      cameraError.value = null;
      cameraLoading.value = true;

      if(cameraVideo.value) {
        cameraVideo.value.startCamera();
      }
    }

    function cleanup() {
      // Stop camera if active
      if(cameraVideo.value) {
        cameraVideo.value.stopCamera();
      }

      // Clear any timers or resources
      scanResults.value = [];
      cameraError.value = null;
    }

    function startScanning() {
      if(!scanSource.value) {
        emit('error', {
          error: new Error('No scan source available'),
          type: 'no_source'
        });
        return;
      }

      // Trigger manual scan - the orchestrator will handle it
      triggerManualScan();
    }

    function stopScanning() {
      // The orchestrator component will handle stopping via its internal
      // abort controller
      isScanning.value = false;
      emit('scanning', false);
    }

    function resetScanner() {
      // Clear results and reset state
      scanResults.value = [];
      cameraError.value = null;
      isScanning.value = false;

      // Optionally restart camera
      if(cameraVideo.value && props.autoStartCamera) {
        retryCameraAccess();
      }
    }

    function captureCurrentFrame() {
      // Delegate to camera component
      if(cameraVideo.value) {
        return cameraVideo.value.captureFrame();
      }
      throw new Error('No active camera for frame capture');
    }

    // === Lifecycle Hooks ===
    onMounted(() => {
      // Initialize any required state
      if(props.autoStartCamera) {
        // Camera will auto-start via CameraVideoComponent's autoStart prop
        cameraLoading.value = true;
      }

      // Set up any watchers for prop changes
      setupWatchers();
    });

    onBeforeUnmount(() => {
      // Clean up resources
      cleanup();
    });

    // === Expose Methods ===
    expose({
      // Core scanner methods
      startScanning,
      stopScanning,
      resetScanner,

      // Camera methods
      captureCurrentFrame,
      retryCameraAccess,

      // State access
      clearResults,

      // Getters for current state
      isScanning: () => isScanning.value,
      hasResults: () => scanResults.value.length > 0,
      getCameraElement: () => cameraVideo.value?.getVideoElement(),
      getCurrentResults: () => [...scanResults.value]
    });

    // === Return Template Data ===
    return {
      // Refs
      cameraVideo,
      cameraLoading,
      cameraError,
      cameraCapabilities,
      availableCameras,
      currentDeviceId,
      zoomLevel,
      videoSize,
      scanSource,
      isScanning,
      scanResults,
      loadingMessage,

      // Computed
      cameraConstraints,

      // Event handlers
      onCameraReady,
      onCameraError,
      onCapabilitiesDetected,
      onDeviceChanged,
      onTorchToggled,
      onZoomChanged,
      onFormatsChanged,
      onModeChanged,
      onContinuousChanged,
      triggerManualScan,
      onFileSelected,
      onScanResult,
      onScanError,
      onScanProgress,
      onResultSelected,
      clearResults,
      onRegionCalculated,
      retryCameraAccess,

      // Exposed utility methods (for template use if needed)
      resetScanner
    };
  }
};
</script>

<!-- === STYLING === -->
<style scoped>
.optical-scanner-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.scanner-main-area {
  position: relative;
  width: 100%;
  min-height: 300px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Mobile-first responsive design */
@media (max-width: 768px) {
  .optical-scanner-container {
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
  }

  .scanner-main-area {
    min-height: 250px;
  }
}

@media (min-width: 769px) {
  .scanner-main-area {
    min-height: 400px;
  }
}

/* Ensure proper layering for overlays */
.scanner-main-area > * {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.scanner-main-area > *:first-child {
  position: relative;
}
</style>
