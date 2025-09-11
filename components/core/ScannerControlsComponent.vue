<template>
  <div class="scanner-controls-container">
    <!-- Format Selection -->
    <div class="control-section">
      <h3 class="section-title">Scan Formats</h3>
      <div class="format-checkboxes">
        <label 
          v-for="format in availableFormats"
          :key="format"
          class="format-checkbox">
          <input
            type="checkbox"
            :value="format"
            :checked="selectedFormats.includes(format)"
            :disabled="disabled || scanning"
            @change="onFormatChange(format, $event.target.checked)" />
          <span class="checkbox-label">{{ getFormatLabel(format) }}</span>
        </label>
      </div>
    </div>

    <!-- Scan Mode Selection -->
    <div class="control-section">
      <h3 class="section-title">Scan Mode</h3>
      <div class="mode-radio-group">
        <label 
          v-for="modeOption in availableModes"
          :key="modeOption.value"
          class="mode-radio">
          <input
            type="radio"
            :value="modeOption.value"
            :checked="mode === modeOption.value"
            :disabled="disabled || scanning"
            name="scanMode"
            @change="onModeChange(modeOption.value)" />
          <span class="radio-label">
            <strong>{{ modeOption.label }}</strong>
            <small>{{ modeOption.description }}</small>
          </span>
        </label>
      </div>
    </div>

    <!-- Continuous Scanning Toggle -->
    <div class="control-section">
      <label class="continuous-toggle">
        <input
          type="checkbox"
          :checked="continuousScanning"
          :disabled="disabled"
          @change="onContinuousChange($event.target.checked)" />
        <span class="toggle-label">
          <strong>Continuous Scanning</strong>
          <small>Automatically scan for codes repeatedly</small>
        </span>
      </label>
    </div>

    <!-- Scan Action Button -->
    <div class="control-section">
      <button
        :disabled="disabled || !canScan || (scanning && !continuousScanning)"
        :class="['scan-button', {
          'scanning': scanning,
          'continuous': continuousScanning,
          'ready': canScan && !scanning
        }]"
        @click="onScanTrigger">
        <span class="scan-icon">{{ getScanButtonIcon() }}</span>
        <span class="scan-text">{{ getScanButtonText() }}</span>
      </button>
    </div>

    <!-- Scan Status -->
    <div v-if="scanning || lastScanInfo" class="control-section status-section">
      <div class="scan-status">
        <div v-if="scanning" class="status-item scanning">
          <span class="status-icon">🔍</span>
          <span class="status-text">Scanning {{ selectedFormats.join(', ') }}...</span>
        </div>
        <div v-if="lastScanInfo && !scanning" class="status-item completed">
          <span class="status-icon">{{ lastScanInfo.success ? '✅' : '❌' }}</span>
          <span class="status-text">{{ lastScanInfo.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { ref, computed, watch } from 'vue';
import { AVAILABLE_FORMATS, FORMAT_LABELS, SCAN_MODES } from '../../lib/utils/constants.js';

export default {
  name: 'ScannerControlsComponent',
  props: {
    formatsToSupport: {
      type: Array,
      default: () => ['qr_code']
    },
    availableFormats: {
      type: Array,
      default: () => [...AVAILABLE_FORMATS]
    },
    mode: {
      type: String,
      default: 'first',
      validator: (value) => SCAN_MODES.includes(value)
    },
    scanning: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    continuousScanning: {
      type: Boolean,
      default: false
    },
    lastScanResult: {
      type: Object,
      default: null
    }
  },
  emits: [
    'scan-triggered',
    'formats-changed',
    'mode-changed',
    'continuous-changed'
  ],
  setup(props, { emit }) {
    // Step 1: Reactive state
    const selectedFormats = ref([...props.formatsToSupport]);
    const lastScanInfo = ref(null);
    
    // Step 2: Computed properties
    const canScan = computed(() => {
      return selectedFormats.value.length > 0 && !props.disabled;
    });
    
    const availableModes = computed(() => [
      {
        value: 'first',
        label: 'First Match',
        description: 'Stop at first successful scan'
      },
      {
        value: 'all', 
        label: 'All Formats',
        description: 'Scan all selected formats'
      },
      {
        value: 'exhaustive',
        label: 'Exhaustive',
        description: 'Let all scanners complete'
      }
    ]);
    
    // Step 3: Watchers
    watch(() => props.formatsToSupport, (newFormats) => {
      selectedFormats.value = [...newFormats];
    }, { immediate: true });
    
    watch(() => props.lastScanResult, (result) => {
      if (result) {
        lastScanInfo.value = {
          success: result.success || result.length > 0,
          message: result.success 
            ? `Found ${result.length || 1} result(s)`
            : result.error || 'No results found'
        };
        
        // Clear status after 3 seconds
        setTimeout(() => {
          lastScanInfo.value = null;
        }, 3000);
      }
    });
    
    // Step 4: Event handlers
    function onFormatChange(format, checked) {
      const newFormats = checked 
        ? [...selectedFormats.value, format]
        : selectedFormats.value.filter(f => f !== format);
      
      selectedFormats.value = newFormats;
      emit('formats-changed', { formats: newFormats });
    }
    
    function onModeChange(newMode) {
      if (newMode !== props.mode) {
        emit('mode-changed', { mode: newMode });
      }
    }
    
    function onContinuousChange(continuous) {
      emit('continuous-changed', { continuous });
    }
    
    function onScanTrigger() {
      if (!canScan.value || (props.scanning && !props.continuousScanning)) {
        return;
      }
      
      emit('scan-triggered');
    }
    
    // Step 5: Helper functions
    function getFormatLabel(format) {
      return FORMAT_LABELS[format] || format.toUpperCase();
    }
    
    function getScanButtonIcon() {
      if (props.scanning) {
        return props.continuousScanning ? '⏹️' : '🔍';
      }
      return props.continuousScanning ? '🔄' : '📷';
    }
    
    function getScanButtonText() {
      if (props.scanning) {
        return props.continuousScanning ? 'Stop Scanning' : 'Scanning...';
      }
      
      if (props.continuousScanning) {
        return 'Start Continuous';
      }
      
      return 'Scan Now';
    }
    
    // Step 6: Return object - only what template needs
    return {
      // State
      selectedFormats,
      lastScanInfo,
      
      // Computed
      canScan,
      availableModes,
      
      // Event handlers
      onFormatChange,
      onModeChange,
      onContinuousChange,
      onScanTrigger,
      
      // Helpers
      getFormatLabel,
      getScanButtonIcon,
      getScanButtonText
    };
  }
};
</script>

<style scoped>
.scanner-controls-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-width: 300px;
}

.control-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 4px;
}

/* Format Selection */
.format-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
}

.format-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.format-checkbox:hover {
  background: #e9ecef;
  border-color: #007bff;
}

.format-checkbox input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.format-checkbox input[type="checkbox"]:disabled {
  cursor: not-allowed;
}

.checkbox-label {
  font-size: 14px;
  color: #333;
  cursor: pointer;
  user-select: none;
}

/* Mode Selection */
.mode-radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mode-radio {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.mode-radio:hover {
  background: #e9ecef;
  border-color: #007bff;
}

.mode-radio input[type="radio"] {
  margin: 2px 0 0 0;
  cursor: pointer;
}

.radio-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  user-select: none;
}

.radio-label strong {
  font-size: 14px;
  color: #333;
}

.radio-label small {
  font-size: 12px;
  color: #666;
  line-height: 1.3;
}

/* Continuous Toggle */
.continuous-toggle {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.continuous-toggle:hover {
  background: #e9ecef;
  border-color: #28a745;
}

.continuous-toggle input[type="checkbox"] {
  margin: 2px 0 0 0;
  cursor: pointer;
}

.toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  user-select: none;
}

.toggle-label strong {
  font-size: 14px;
  color: #333;
}

.toggle-label small {
  font-size: 12px;
  color: #666;
}

/* Scan Button */
.scan-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 60px;
}

.scan-button.ready {
  background: #28a745;
  color: white;
}

.scan-button.ready:hover:not(:disabled) {
  background: #218838;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.scan-button.scanning {
  background: #ffc107;
  color: #000;
}

.scan-button.scanning.continuous {
  background: #dc3545;
  color: white;
}

.scan-button:disabled {
  background: #6c757d;
  color: #fff;
  cursor: not-allowed;
  opacity: 0.6;
}

.scan-icon {
  font-size: 20px;
}

.scan-text {
  font-weight: 600;
}

/* Status Section */
.status-section {
  border-top: 1px solid #e0e0e0;
  padding-top: 16px;
}

.scan-status {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 14px;
}

.status-item.scanning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.status-item.completed {
  background: #d1ecf1;
  color: #0c5460;
  border: 1px solid #bee5eb;
}

.status-icon {
  font-size: 16px;
}

.status-text {
  font-weight: 500;
}

/* Responsive Design */
@media (max-width: 768px) {
  .scanner-controls-container {
    padding: 16px;
    min-width: unset;
  }
  
  .format-checkboxes {
    grid-template-columns: 1fr;
  }
  
  .scan-button {
    padding: 14px 20px;
    font-size: 15px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .scanner-controls-container {
    background: #1a1a1a;
    border-color: #404040;
    color: #e0e0e0;
  }
  
  .section-title {
    color: #e0e0e0;
    border-color: #0d6efd;
  }
  
  .format-checkbox,
  .mode-radio,
  .continuous-toggle {
    background: #2d2d2d;
    border-color: #404040;
  }
  
  .format-checkbox:hover,
  .mode-radio:hover,
  .continuous-toggle:hover {
    background: #3d3d3d;
  }
  
  .checkbox-label,
  .radio-label strong,
  .toggle-label strong {
    color: #e0e0e0;
  }
  
  .radio-label small,
  .toggle-label small {
    color: #b0b0b0;
  }
}
</style>
