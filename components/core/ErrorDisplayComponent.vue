<template>
  <div
    v-if="hasError"
    class="error-display-container"
    :class="containerClasses">
    <!-- Camera Error Display -->
    <div
      v-if="cameraError"
      class="error-content camera-error">
      <!-- Error Icon -->
      <div class="error-icon">
        <i
          v-if="isCameraPermissionError"
          class="fas fa-video-slash" />
        <i
          v-else
          class="fas fa-exclamation-triangle" />
      </div>

      <!-- Error Message -->
      <div class="error-message">
        <h3 class="error-title">
          {{cameraErrorTitle}}
        </h3>
        <p class="error-description">
          {{cameraErrorMessage}}
        </p>
      </div>

      <!-- Recovery Actions -->
      <div class="error-actions">
        <button
          v-if="retryable && !autoRetryActive"
          class="action-button primary"
          @click="handleRetry('camera')">
          <i class="fas fa-redo" />
          Try Again
        </button>

        <button
          v-if="isCameraPermissionError"
          class="action-button secondary"
          @click="showCameraHelp = true">
          <i class="fas fa-question-circle" />
          Help
        </button>

        <button
          class="action-button secondary"
          @click="handleDismiss('camera')">
          <i class="fas fa-times" />
          {{isCriticalError ? 'Close' : 'Dismiss'}}
        </button>
      </div>

      <!-- Auto Retry Indicator -->
      <div
        v-if="autoRetryActive"
        class="auto-retry-indicator">
        <div class="retry-spinner" />
        <span>Retrying in {{autoRetryCountdown}}s...</span>
      </div>
    </div>

    <!-- Scan Error Display -->
    <div
      v-if="scanError && !cameraError"
      class="error-content scan-error">
      <!-- Error Icon -->
      <div class="error-icon">
        <i
          v-if="isNoResultsError"
          class="fas fa-search" />
        <i
          v-else
          class="fas fa-exclamation-triangle" />
      </div>

      <!-- Error Message -->
      <div class="error-message">
        <h3 class="error-title">
          {{scanErrorTitle}}
        </h3>
        <p class="error-description">
          {{scanErrorMessage}}
        </p>
      </div>

      <!-- Recovery Actions -->
      <div class="error-actions">
        <button
          v-if="retryable && !autoRetryActive"
          class="action-button primary"
          @click="handleRetry('scan')">
          <i class="fas fa-redo" />
          Try Again
        </button>

        <button
          v-if="isNoResultsError"
          class="action-button secondary"
          @click="showScanHelp = true">
          <i class="fas fa-lightbulb" />
          Tips
        </button>

        <button
          class="action-button secondary"
          @click="handleDismiss('scan')">
          <i class="fas fa-times" />
          Dismiss
        </button>
      </div>
    </div>

    <!-- Camera Help Modal -->
    <div
      v-if="showCameraHelp"
      class="help-modal-overlay"
      @click.self="showCameraHelp = false">
      <div class="help-modal">
        <div class="help-header">
          <h3>Camera Permission Help</h3>
          <button
            class="help-close"
            @click="showCameraHelp = false">
            <i class="fas fa-times" />
          </button>
        </div>
        <div class="help-content">
          <div class="help-step">
            <strong>Chrome/Edge:</strong>
            <ol>
              <li>Click the camera icon in the address bar</li>
              <li>Select "Always allow camera access"</li>
              <li>Reload the page</li>
            </ol>
          </div>
          <div class="help-step">
            <strong>Firefox:</strong>
            <ol>
              <li>Click the shield icon in the address bar</li>
              <li>Turn off "Blocked" for camera</li>
              <li>Refresh the page</li>
            </ol>
          </div>
          <div class="help-step">
            <strong>Safari:</strong>
            <ol>
              <li>Go to Safari > Settings > Websites</li>
              <li>Select "Camera" and allow this site</li>
              <li>Reload the page</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <!-- Scan Help Modal -->
    <div
      v-if="showScanHelp"
      class="help-modal-overlay"
      @click.self="showScanHelp = false">
      <div class="help-modal">
        <div class="help-header">
          <h3>Scanning Tips</h3>
          <button
            class="help-close"
            @click="showScanHelp = false">
            <i class="fas fa-times" />
          </button>
        </div>
        <div class="help-content">
          <div class="help-step">
            <strong>For QR Codes:</strong>
            <ul>
              <li>Hold camera 6-12 inches away</li>
              <li>Ensure good lighting</li>
              <li>Keep the code flat and centered</li>
            </ul>
          </div>
          <div class="help-step">
            <strong>For PDF417 (Driver License):</strong>
            <ul>
              <li>Scan the barcode on the back</li>
              <li>Hold steady within the orange box</li>
              <li>Avoid shadows and glare</li>
              <li>Try portrait orientation</li>
            </ul>
          </div>
          <div class="help-step">
            <strong>Alternative:</strong>
            <ul>
              <li>Use the upload button to select a photo</li>
              <li>Take a clear, well-lit photo first</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'ErrorDisplayComponent',
  props: {
    cameraError: {
      type: [Boolean, String, Error],
      default: null
    },
    scanError: {
      type: [String, Error],
      default: null
    },
    retryable: {
      type: Boolean,
      default: true
    },
    autoRetryDelay: {
      type: Number,
      default: 0 // 0 = no auto retry, >0 = seconds to wait
    },
    maxAutoRetries: {
      type: Number,
      default: 3
    },
    overlay: {
      type: Boolean,
      default: true // Show as overlay vs inline
    },
    position: {
      type: String,
      default: 'center' // 'center', 'top', 'bottom', 'inline'
    }
  },
  emits: [
    'retry', // { type: 'camera' | 'scan' }
    'dismiss', // { type: 'camera' | 'scan' }
    'auto-retry' // { type: 'camera' | 'scan', attempt: number }
  ],
  data() {
    return {
      showCameraHelp: false,
      showScanHelp: false,
      autoRetryActive: false,
      autoRetryCountdown: 0,
      autoRetryAttempts: 0,
      autoRetryTimer: null
    };
  },
  computed: {
    // Check if any error exists
    hasError() {
      return !!(this.cameraError || this.scanError);
    },

    // Container styling classes
    containerClasses() {
      return [
        {
          'error-overlay': this.overlay,
          'error-inline': !this.overlay,
          'error-critical': this.isCriticalError
        },
        `error-position-${this.position}`
      ];
    },

    // Camera error analysis
    cameraErrorType() {
      if(!this.cameraError) {
        return null;
      }

      const errorString = this.getErrorString(this.cameraError);

      if(errorString.includes('NotAllowedError') ||
          errorString.includes('permission') ||
          errorString.includes('denied')) {
        return 'permission';
      }
      if(errorString.includes('NotFoundError') ||
          errorString.includes('no camera') ||
          errorString.includes('not found')) {
        return 'not-found';
      }
      if(errorString.includes('NotReadableError') ||
          errorString.includes('in use') ||
          errorString.includes('already')) {
        return 'in-use';
      }
      if(errorString.includes('NotSupportedError') ||
          errorString.includes('not supported')) {
        return 'not-supported';
      }

      return 'unknown';
    },

    isCameraPermissionError() {
      return this.cameraErrorType === 'permission';
    },

    isCriticalError() {
      return this.cameraErrorType === 'not-found' ||
             this.cameraErrorType === 'not-supported';
    },

    cameraErrorTitle() {
      switch(this.cameraErrorType) {
        case 'permission':
          return 'Camera Permission Required';
        case 'not-found':
          return 'No Camera Found';
        case 'in-use':
          return 'Camera In Use';
        case 'not-supported':
          return 'Camera Not Supported';
        default:
          return 'Camera Error';
      }
    },

    cameraErrorMessage() {
      switch(this.cameraErrorType) {
        case 'permission':
          return 'Please allow camera access to scan barcodes. ' +
            'You can also upload a photo instead.';
        case 'not-found':
          return 'No camera was found on this device. Please use the upload ' +
            'option to scan from a photo.';
        case 'in-use':
          return 'The camera is being used by another application. ' +
            'Please close other apps and try again.';
        case 'not-supported':
          return 'Camera access is not supported on this device. ' +
            'Please use the upload option.';
        default:
          return this.getErrorString(this.cameraError) ||
            'An error occurred accessing the camera.';
      }
    },

    // Scan error analysis
    scanErrorType() {
      if(!this.scanError) {
        return null;
      }

      const errorString = this.getErrorString(this.scanError);

      if(errorString.includes('no results') ||
          errorString.includes('not found') ||
          errorString.includes('no barcode')) {
        return 'no-results';
      }
      if(errorString.includes('license') ||
          errorString.includes('parsing') ||
          errorString.includes('invalid format')) {
        return 'parsing';
      }
      if(errorString.includes('file') ||
          errorString.includes('upload') ||
          errorString.includes('image')) {
        return 'file';
      }

      return 'unknown';
    },

    isNoResultsError() {
      return this.scanErrorType === 'no-results';
    },

    scanErrorTitle() {
      switch(this.scanErrorType) {
        case 'no-results':
          return 'No Barcode Found';
        case 'parsing':
          return 'Invalid Barcode';
        case 'file':
          return 'File Error';
        default:
          return 'Scan Error';
      }
    },

    scanErrorMessage() {
      switch(this.scanErrorType) {
        case 'no-results':
          return 'No barcode could be detected. Please ensure the barcode ' +
            'is clear and well-lit, then try again.';
        case 'parsing':
          return 'The barcode was detected but could not be parsed. ' +
            'Please ensure it\'s a valid driver license barcode.';
        case 'file':
          return 'There was an error processing the uploaded file. ' +
            'Please try a different image.';
        default:
          return this.getErrorString(this.scanError) ||
            'An error occurred during scanning.';
      }
    }
  },
  watch: {
    // Start auto retry when appropriate
    cameraError(newError, oldError) {
      if(newError && !oldError && this.shouldAutoRetry('camera')) {
        this.startAutoRetry('camera');
      }
    },

    scanError(newError, oldError) {
      if(newError && !oldError && this.shouldAutoRetry('scan')) {
        this.startAutoRetry('scan');
      }
    }
  },
  beforeUnmount() {
    this.clearAutoRetry();
  },
  methods: {
    // Error string extraction
    getErrorString(error) {
      if(typeof error === 'string') {
        return error;
      }
      if(error instanceof Error) {
        return error.message || error.name;
      }

      if(error && typeof error === 'object') {
        return error.message || JSON.stringify(error);
      }
      return String(error);
    },

    // Event handlers
    handleRetry(type) {
      this.clearAutoRetry();
      this.$emit('retry', {type});
    },

    handleDismiss(type) {
      this.clearAutoRetry();
      this.$emit('dismiss', {type});
    },

    // Auto retry logic
    shouldAutoRetry(type) {
      if(this.autoRetryDelay <= 0) {
        return false;
      }

      if(this.autoRetryAttempts >= this.maxAutoRetries) {
        return false;
      }

      // Don't auto retry critical errors
      if(type === 'camera' && this.isCriticalError) {
        return false;
      }

      return true;
    },

    startAutoRetry(type) {
      if(this.autoRetryActive) {
        return;
      }

      this.autoRetryActive = true;
      this.autoRetryCountdown = this.autoRetryDelay;

      this.autoRetryTimer = setInterval(() => {
        this.autoRetryCountdown--;

        if(this.autoRetryCountdown <= 0) {
          this.executeAutoRetry(type);
        }
      }, 1000);
    },

    executeAutoRetry(type) {
      this.clearAutoRetry();
      this.autoRetryAttempts++;

      this.$emit('auto-retry', {
        type,
        attempt: this.autoRetryAttempts
      });
    },

    clearAutoRetry() {
      if(this.autoRetryTimer) {
        clearInterval(this.autoRetryTimer);
        this.autoRetryTimer = null;
      }
      this.autoRetryActive = false;
      this.autoRetryCountdown = 0;
    }
  }
};
</script>

<style scoped>
/* Base Container */
.error-display-container {
  z-index: 1500;
  font-family:
    -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
}

/* Overlay vs Inline */
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.error-inline {
  position: relative;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  margin: 10px 0;
}

/* Position Variations */
.error-position-center {
  align-items: center;
  justify-content: center;
}

.error-position-top {
  align-items: flex-start;
  justify-content: center;
  padding-top: 10%;
}

.error-position-bottom {
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 10%;
}

/* Error Content */
.error-content {
  background: white;
  border-radius: 12px;
  padding: 30px;
  max-width: 400px;
  width: 100%;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  animation: errorSlideIn 0.3s ease-out;
}

.error-inline .error-content {
  background: transparent;
  box-shadow: none;
  padding: 20px;
}

/* Error Types */
.camera-error {
  border-top: 4px solid #dc2626;
}

.scan-error {
  border-top: 4px solid #d97706;
}

/* Error Icon */
.error-icon {
  font-size: 48px;
  margin-bottom: 20px;
  color: #dc2626;
}

.scan-error .error-icon {
  color: #d97706;
}

/* Error Message */
.error-message {
  margin-bottom: 25px;
}

.error-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 12px 0;
}

.error-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0;
}

/* Action Buttons */
.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.action-button {
  padding: 12px 20px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  min-width: 100px;
  justify-content: center;
}

.action-button.primary {
  background: #dc2626;
  color: white;
}

.action-button.primary:hover {
  background: #b91c1c;
  transform: translateY(-1px);
}

.action-button.secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.action-button.secondary:hover {
  background: #e5e7eb;
}

/* Auto Retry Indicator */
.auto-retry-indicator {
  margin-top: 20px;
  padding: 15px;
  background: #fef3c7;
  border-radius: 8px;
  color: #92400e;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.retry-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #fcd34d;
  border-top: 2px solid #92400e;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Help Modal */
.help-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.help-modal {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  animation: modalSlideIn 0.3s ease-out;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 25px 15px;
  border-bottom: 1px solid #e5e7eb;
}

.help-header h3 {
  margin: 0;
  color: #111827;
  font-size: 18px;
  font-weight: 600;
}

.help-close {
  background: none;
  border: none;
  font-size: 18px;
  color: #6b7280;
  cursor: pointer;
  padding: 5px;
}

.help-close:hover {
  color: #374151;
}

.help-content {
  padding: 20px 25px 25px;
}

.help-step {
  margin-bottom: 20px;
}

.help-step:last-child {
  margin-bottom: 0;
}

.help-step strong {
  color: #111827;
  display: block;
  margin-bottom: 8px;
}

.help-step ol,
.help-step ul {
  margin: 0;
  padding-left: 20px;
  color: #4b5563;
  font-size: 14px;
  line-height: 1.5;
}

.help-step li {
  margin-bottom: 4px;
}

/* Animations */
@keyframes errorSlideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Critical Error Styling */
.error-critical .error-content {
  border-top-color: #991b1b;
}

.error-critical .error-icon {
  color: #991b1b;
}

/* Responsive Design */
@media (max-width: 640px) {
  .error-overlay {
    padding: 15px;
  }

  .error-content {
    padding: 25px 20px;
  }

  .error-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .action-button {
    min-width: auto;
  }

  .help-modal {
    margin: 10px;
    max-height: 90vh;
  }
}

/* Safe area adjustments for mobile */
@media (max-width: 480px) {
  .error-position-top {
    padding-top: calc(env(safe-area-inset-top, 0px) + 60px);
  }

  .error-position-bottom {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 60px);
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .error-content {
    border: 2px solid #000;
  }

  .action-button {
    border: 2px solid;
  }
}
</style>
