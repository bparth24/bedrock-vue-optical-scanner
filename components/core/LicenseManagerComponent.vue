<template>
  <div class="license-manager-container">
    <!-- License Status Display (only show if requested) -->
    <div v-if="showStatus" class="license-status">
      <div class="license-indicator">
        <div :class="['status-icon', statusClass]">
          {{ getStatusIcon() }}
        </div>
        <div class="status-text">
          <div class="status-label">{{ getStatusLabel() }}</div>
          <div v-if="statusMessage" class="status-message">{{ statusMessage }}</div>
        </div>
      </div>
      
      <!-- License Details (when expanded) -->
      <div v-if="showDetails" class="license-details">
        <div class="detail-item" v-if="licenseInfo.type">
          <span class="detail-label">Type:</span>
          <span class="detail-value">{{ licenseInfo.type }}</span>
        </div>
        <div class="detail-item" v-if="licenseInfo.expiryDate">
          <span class="detail-label">Expires:</span>
          <span class="detail-value">{{ formatDate(licenseInfo.expiryDate) }}</span>
        </div>
        <div class="detail-item" v-if="licenseInfo.organization">
          <span class="detail-label">Organization:</span>
          <span class="detail-value">{{ licenseInfo.organization }}</span>
        </div>
        <div class="detail-item" v-if="licenseInfo.version">
          <span class="detail-label">Version:</span>
          <span class="detail-value">{{ licenseInfo.version }}</span>
        </div>
      </div>
      
      <!-- Action Buttons -->
      <div v-if="showActions" class="license-actions">
        <button
          v-if="status === 'error' || status === 'expired'"
          @click="retryInitialization"
          :disabled="initializing"
          class="action-button retry-button">
          <span class="button-icon">🔄</span>
          {{ initializing ? 'Retrying...' : 'Retry' }}
        </button>
        
        <button
          @click="validateLicense"
          :disabled="initializing || !isInitialized"
          class="action-button validate-button">
          <span class="button-icon">✓</span>
          Validate
        </button>
        
        <button
          v-if="showDetails"
          @click="toggleDetails"
          class="action-button details-button">
          <span class="button-icon">{{ showDetails ? '▲' : '▼' }}</span>
          {{ showDetails ? 'Hide' : 'Show' }} Details
        </button>
      </div>
    </div>
    
    <!-- Error Display -->
    <div v-if="lastError && showError" class="license-error">
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-message">
          <div class="error-title">License Error</div>
          <div class="error-details">{{ getErrorMessage(lastError) }}</div>
        </div>
        <button @click="dismissError" class="error-dismiss">✕</button>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { ref, reactive, computed, watch, onMounted } from 'vue';

export default {
  name: 'LicenseManagerComponent',
  props: {
    pdf417Config: {
      type: Object,
      required: true,
      validator: (config) => {
        return config && (config.license || config.licenseServer);
      }
    },
    licenseServer: {
      type: String,
      default: null
    },
    autoInitialize: {
      type: Boolean,
      default: true
    },
    // UI control props
    showStatus: {
      type: Boolean,
      default: false
    },
    showActions: {
      type: Boolean,
      default: false
    },
    showError: {
      type: Boolean,
      default: true
    },
    retryAttempts: {
      type: Number,
      default: 3
    },
    retryDelay: {
      type: Number,
      default: 2000 // 2 seconds
    }
  },
  emits: [
    'license-initialized',    // { success: boolean, info: Object }
    'license-error',          // { error: Error, retryable: boolean }
    'license-validated',      // { valid: boolean, info: Object }
    'status-changed'          // { status: string, message: string }
  ],
  setup(props, { emit, expose }) {
    // Step 1: Reactive state
    const status = ref('uninitialized'); // 'uninitialized', 'initializing', 'initialized', 'error', 'expired'
    const statusMessage = ref('');
    const initializing = ref(false);
    const validating = ref(false);
    const lastError = ref(null);
    const retryCount = ref(0);
    const showDetails = ref(false);
    const showError = ref(true);
    
    // License information
    const licenseInfo = reactive({
      type: '',
      organization: '',
      expiryDate: null,
      version: '',
      features: [],
      initialized: false
    });
    
    // Step 2: Module-level variables for Dynamsoft objects
    let BarcodeReader = null;
    let BarcodeScanner = null;
    let retryTimer = null;
    
    // Step 3: Computed properties
    const isInitialized = computed(() => {
      return status.value === 'initialized' && licenseInfo.initialized;
    });
    
    const statusClass = computed(() => {
      return `status-${status.value}`;
    });
    
    const effectiveLicenseServer = computed(() => {
      return props.licenseServer || props.pdf417Config.licenseServer;
    });
    
    const effectiveLicense = computed(() => {
      return props.pdf417Config.license;
    });
    
    // Step 4: Main license management functions
    async function initializeLicense() {
      if (initializing.value) return;
      
      initializing.value = true;
      status.value = 'initializing';
      statusMessage.value = 'Initializing Dynamsoft license...';
      lastError.value = null;
      
      emit('status-changed', {
        status: status.value,
        message: statusMessage.value
      });
      
      try {
        // Import Dynamsoft modules
        await importDynamsoftModules();
        
        // Initialize license
        if (effectiveLicenseServer.value) {
          await initializeWithLicenseServer();
        } else if (effectiveLicense.value) {
          await initializeWithLicenseKey();
        } else {
          throw new Error('No license key or license server provided');
        }
        
        // Validate the license
        await performLicenseValidation();
        
        // Success
        status.value = 'initialized';
        statusMessage.value = 'License initialized successfully';
        licenseInfo.initialized = true;
        retryCount.value = 0;
        
        emit('license-initialized', {
          success: true,
          info: { ...licenseInfo }
        });
        
        emit('status-changed', {
          status: status.value,
          message: statusMessage.value
        });
        
      } catch (error) {
        console.error('License initialization failed:', error);
        
        status.value = 'error';
        statusMessage.value = 'License initialization failed';
        lastError.value = error;
        showError.value = true;
        
        const isRetryable = isRetryableError(error);
        
        emit('license-error', {
          error,
          retryable: isRetryable
        });
        
        emit('status-changed', {
          status: status.value,
          message: statusMessage.value
        });
        
        // Auto-retry for retryable errors
        if (isRetryable && retryCount.value < props.retryAttempts) {
          scheduleRetry();
        }
        
      } finally {
        initializing.value = false;
      }
    }
    
    async function importDynamsoftModules() {
      try {
        // Dynamic import based on what's available
        if (typeof window !== 'undefined') {
          // Try to import from global modules first
          if (window.Dynamsoft?.DBR?.BarcodeReader) {
            BarcodeReader = window.Dynamsoft.DBR.BarcodeReader;
          } else {
            // Try to import via ES modules
            const { BarcodeReader: DBR } = await import('dynamsoft-javascript-barcode');
            BarcodeReader = DBR;
          }
          
          // Try to import BarcodeScanner if available
          if (window.Dynamsoft?.DCE?.CameraEnhancer) {
            const { BarcodeScanner: BS } = await import('dynamsoft-javascript-barcode');
            BarcodeScanner = BS;
          }
        }
        
        if (!BarcodeReader) {
          throw new Error('Dynamsoft BarcodeReader not available');
        }
        
        // Set engine resource path if not already set
        if (!BarcodeReader.engineResourcePath) {
          BarcodeReader.engineResourcePath = 
            'https://cdn.jsdelivr.net/npm/dynamsoft-javascript-barcode@9.6.1/dist/';
        }
        
      } catch (error) {
        throw new Error(`Failed to import Dynamsoft modules: ${error.message}`);
      }
    }
    
    async function initializeWithLicenseServer() {
      if (!effectiveLicenseServer.value) {
        throw new Error('License server URL not provided');
      }
      
      statusMessage.value = 'Connecting to license server...';
      
      try {
        // Initialize with license server
        await BarcodeReader.initLicense(effectiveLicenseServer.value);
        
        licenseInfo.type = 'Server-based';
        licenseInfo.organization = 'Via License Server';
        
      } catch (error) {
        throw new Error(`License server initialization failed: ${error.message}`);
      }
    }
    
    async function initializeWithLicenseKey() {
      if (!effectiveLicense.value) {
        throw new Error('License key not provided');
      }
      
      statusMessage.value = 'Validating license key...';
      
      try {
        // Set license key directly
        BarcodeReader.license = effectiveLicense.value;
        
        // Test by creating an instance
        const testReader = await BarcodeReader.createInstance();
        await testReader.destroyContext();
        
        licenseInfo.type = 'License Key';
        licenseInfo.organization = 'Direct License';
        
      } catch (error) {
        throw new Error(`License key validation failed: ${error.message}`);
      }
    }
    
    async function performLicenseValidation() {
      statusMessage.value = 'Validating license...';
      
      try {
        // Create a test instance to validate
        const testReader = await BarcodeReader.createInstance();
        
        // Get version info if available
        if (testReader.getVersion) {
          licenseInfo.version = testReader.getVersion();
        }
        
        await testReader.destroyContext();
        
        // Check for license expiry (if available in future Dynamsoft versions)
        // This is a placeholder for future enhancement
        checkLicenseExpiry();
        
      } catch (error) {
        throw new Error(`License validation failed: ${error.message}`);
      }
    }
    
    function checkLicenseExpiry() {
      // Placeholder for future license expiry checking
      // Dynamsoft doesn't currently expose expiry date via API
      // This could be enhanced in future versions
      
      // For now, we'll assume license is valid if we got this far
      licenseInfo.expiryDate = null;
    }
    
    async function validateLicense() {
      if (validating.value) return false;
      
      validating.value = true;
      statusMessage.value = 'Validating license...';
      
      try {
        // Test license by creating and destroying an instance
        const testReader = await BarcodeReader.createInstance();
        await testReader.destroyContext();
        
        emit('license-validated', {
          valid: true,
          info: { ...licenseInfo }
        });
        
        statusMessage.value = 'License validation successful';
        return true;
        
      } catch (error) {
        console.error('License validation failed:', error);
        
        emit('license-validated', {
          valid: false,
          error: error
        });
        
        statusMessage.value = 'License validation failed';
        return false;
        
      } finally {
        validating.value = false;
      }
    }
    
    // Step 5: Helper functions
    function isRetryableError(error) {
      const retryableErrorTypes = [
        'NetworkError',
        'TimeoutError',
        'Server Error',
        'Connection failed'
      ];
      
      return retryableErrorTypes.some(type => 
        error.message.includes(type) || error.name === type
      );
    }
    
    function scheduleRetry() {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      
      retryCount.value++;
      statusMessage.value = `Retrying in ${props.retryDelay / 1000} seconds... (${retryCount.value}/${props.retryAttempts})`;
      
      retryTimer = setTimeout(() => {
        initializeLicense();
      }, props.retryDelay);
    }
    
    function retryInitialization() {
      if (retryTimer) {
        clearTimeout(retryTimer);
      }
      retryCount.value = 0;
      initializeLicense();
    }
    
    function dismissError() {
      showError.value = false;
      lastError.value = null;
    }
    
    function toggleDetails() {
      showDetails.value = !showDetails.value;
    }
    
    // Step 6: Display helper functions
    function getStatusIcon() {
      const icons = {
        uninitialized: '⏳',
        initializing: '🔄',
        initialized: '✅',
        error: '❌',
        expired: '⏰'
      };
      return icons[status.value] || '❓';
    }
    
    function getStatusLabel() {
      const labels = {
        uninitialized: 'Not Initialized',
        initializing: 'Initializing...',
        initialized: 'Licensed',
        error: 'License Error',
        expired: 'License Expired'
      };
      return labels[status.value] || 'Unknown';
    }
    
    function getErrorMessage(error) {
      if (!error) return '';
      
      // Common error translations
      if (error.message.includes('network')) {
        return 'Network connection failed. Please check your internet connection.';
      }
      if (error.message.includes('license')) {
        return 'Invalid license key or expired license.';
      }
      if (error.message.includes('server')) {
        return 'License server unavailable. Please try again later.';
      }
      
      return error.message || 'An unknown error occurred.';
    }
    
    function formatDate(date) {
      if (!date) return '';
      try {
        return new Date(date).toLocaleDateString();
      } catch {
        return date.toString();
      }
    }
    
    // Step 7: Watchers
    watch(() => props.pdf417Config, () => {
      if (props.autoInitialize && status.value === 'uninitialized') {
        initializeLicense();
      }
    }, { deep: true });
    
    // Step 8: Lifecycle
    onMounted(() => {
      if (props.autoInitialize) {
        initializeLicense();
      }
    });
    
    // Cleanup
    const cleanup = () => {
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };
    
    const beforeUnmount = () => {
      cleanup();
    };
    
    // Step 9: Expose methods for parent components
    expose({
      initializeLicense,
      validateLicense,
      isInitialized: () => isInitialized.value,
      getStatus: () => status.value,
      getLicenseInfo: () => ({ ...licenseInfo }),
      retryInitialization,
      dismissError
    });
    
    // Step 10: Return reactive state and methods for template
    return {
      status,
      statusMessage,
      initializing,
      validating,
      lastError,
      licenseInfo,
      isInitialized,
      statusClass,
      showDetails,
      showError,
      retryInitialization,
      validateLicense,
      dismissError,
      toggleDetails,
      getStatusIcon,
      getStatusLabel,
      getErrorMessage,
      formatDate,
      beforeUnmount
    };
  },
  beforeUnmount() {
    this.beforeUnmount();
  }
};
</script>

<style scoped>
.license-manager-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* License Status */
.license-status {
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.license-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.status-icon {
  font-size: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.8);
}

.status-icon.status-uninitialized {
  background: rgba(108, 117, 125, 0.1);
}

.status-icon.status-initializing {
  background: rgba(0, 123, 255, 0.1);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-icon.status-initialized {
  background: rgba(40, 167, 69, 0.1);
}

.status-icon.status-error {
  background: rgba(220, 53, 69, 0.1);
}

.status-icon.status-expired {
  background: rgba(255, 193, 7, 0.1);
}

.status-text {
  flex: 1;
}

.status-label {
  font-weight: 600;
  font-size: 16px;
  color: #333;
  margin-bottom: 4px;
}

.status-message {
  font-size: 14px;
  color: #666;
}

/* License Details */
.license-details {
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #666;
  font-size: 14px;
}

.detail-value {
  font-size: 14px;
  color: #333;
  text-align: right;
}

/* License Actions */
.license-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.retry-button {
  background: #007bff;
  border-color: #007bff;
  color: white;
}

.retry-button:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
}

.validate-button {
  background: #28a745;
  border-color: #28a745;
  color: white;
}

.validate-button:hover:not(:disabled) {
  background: #218838;
  border-color: #1e7e34;
}

.details-button {
  background: #6c757d;
  border-color: #6c757d;
  color: white;
}

.details-button:hover:not(:disabled) {
  background: #545b62;
  border-color: #545b62;
}

.button-icon {
  font-size: 14px;
}

/* Error Display */
.license-error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  margin-bottom: 16px;
}

.error-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
}

.error-icon {
  font-size: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-message {
  flex: 1;
}

.error-title {
  font-weight: 600;
  color: #721c24;
  margin-bottom: 4px;
}

.error-details {
  color: #721c24;
  font-size: 14px;
  line-height: 1.4;
}

.error-dismiss {
  background: none;
  border: none;
  font-size: 18px;
  color: #721c24;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
}

.error-dismiss:hover {
  opacity: 1;
  background: rgba(114, 28, 36, 0.1);
}

/* Animations */
@keyframes pulse {
  0%, 100% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .license-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .license-actions {
    justify-content: stretch;
  }
  
  .action-button {
    flex: 1;
    justify-content: center;
    min-width: 0;
  }
  
  .detail-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .detail-value {
    text-align: left;
  }
  
  .error-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .error-dismiss {
    align-self: flex-end;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .license-status {
    background: #2d2d2d;
    border-color: #404040;
    color: #e0e0e0;
  }
  
  .status-label {
    color: #e0e0e0;
  }
  
  .status-message {
    color: #b0b0b0;
  }
  
  .license-details {
    background: rgba(0, 0, 0, 0.2);
  }
  
  .detail-label {
    color: #b0b0b0;
  }
  
  .detail-value {
    color: #e0e0e0;
  }
  
  .license-error {
    background: #3d2a2e;
    border-color: #5a3d42;
  }
  
  .error-title,
  .error-details,
  .error-dismiss {
    color: #f8d7da;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .license-status,
  .license-error {
    border-width: 2px;
  }
  
  .action-button {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .status-icon.status-initializing {
    animation: none;
  }
  
  .action-button {
    transition: none;
  }
}
</style>