<template>
  <div class="camera-controls-container">
    <!-- Camera Device Selection -->
    <div
      v-if="cameraList.length > 1"
      class="control-group">
      <label class="control-label">Camera:</label>
      <select
        :value="currentDevice"
        :disabled="disabled"
        class="device-selector"
        @change="onDeviceChange">
        <option value="">
          Select Camera
        </option>
        <option
          v-for="device in cameraList"
          :key="device.deviceId"
          :value="device.deviceId">
          {{device.label || `Camera ${device.deviceId.slice(0, 8)}`}}
        </option>
      </select>
    </div>

    <!-- Torch Control -->
    <div
      v-if="capabilities.torch"
      class="control-group">
      <button
        :disabled="disabled"
        :class="['control-button', 'torch-button', { active: torchOn }]"
        @click="onTorchToggle">
        <span class="torch-icon">{{torchOn ? '🔦' : '💡'}}</span>
        <span class="torch-label">
          {{torchOn ? 'Torch On' : 'Torch Off'}}</span>
      </button>
    </div>

    <!-- Zoom Control -->
    <div
      v-if="capabilities.zoom"
      class="control-group zoom-control">
      <label class="control-label">
        Zoom: {{zoomLevel}}x
      </label>
      <div class="zoom-slider-container">
        <button
          :disabled="disabled || zoomLevel <= constraints.zoom.min"
          class="zoom-button"
          @click="onZoomDecrease">
          <span class="zoom-icon">🔍-</span>
        </button>

        <input
          type="range"
          :value="zoomLevel"
          :min="constraints.zoom.min"
          :max="constraints.zoom.max"
          :step="constraints.zoom.step"
          :disabled="disabled"
          class="zoom-slider"
          @input="onZoomInput"
          @change="onZoomChange">

        <button
          :disabled="disabled || zoomLevel >= constraints.zoom.max"
          class="zoom-button"
          @click="onZoomIncrease">
          <span class="zoom-icon">🔍+</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref} from 'vue';
import {DEFAULT_ZOOM_CONSTRAINTS} from '../../lib/utils/constants.js';

export default {
  name: 'CameraControlsComponent',
  props: {
    cameraList: {
      type: Array,
      default: () => []
    },
    capabilities: {
      type: Object,
      default: () => ({zoom: false, torch: false})
    },
    constraints: {
      type: Object,
      default: () => ({zoom: {...DEFAULT_ZOOM_CONSTRAINTS}})
    },
    currentDevice: {
      type: String,
      default: null
    },
    torchOn: {
      type: Boolean,
      default: false
    },
    zoomLevel: {
      type: Number,
      default: 1
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  emits: [
    'device-changed',
    'torch-toggled',
    'zoom-changed'
  ],
  setup(props, {emit}) {
    // Step 1: Reactive state
    const pendingZoomValue = ref(props.zoomLevel);

    // Step 2: Computed properties
    const isZoomAtMin = computed(() =>
      props.zoomLevel <= props.constraints.zoom.min
    );

    const isZoomAtMax = computed(() =>
      props.zoomLevel >= props.constraints.zoom.max
    );

    // Step 3: Event handlers
    function onDeviceChange(event) {
      const deviceId = event.target.value;
      if(deviceId && deviceId !== props.currentDevice) {
        emit('device-changed', {deviceId});
      }
    }

    function onTorchToggle() {
      if(props.disabled) {
        return;
      }

      const newTorchState = !props.torchOn;
      emit('torch-toggled', {torchOn: newTorchState});
    }

    function onZoomInput(event) {
      // Update pending value during drag (for smooth UI)
      pendingZoomValue.value = parseFloat(event.target.value);
    }

    function onZoomChange(event) {
      // Emit final value when user releases slider
      const newZoomLevel = parseFloat(event.target.value);

      if(newZoomLevel !== props.zoomLevel) {
        emit('zoom-changed', {zoomLevel: newZoomLevel});
      }
    }

    function onZoomDecrease() {
      if(props.disabled || isZoomAtMin.value) {
        return;
      }

      const newZoom = Math.max(
        props.constraints.zoom.min,
        props.zoomLevel - props.constraints.zoom.step
      );

      emit('zoom-changed', {zoomLevel: newZoom});
    }

    function onZoomIncrease() {
      if(props.disabled || isZoomAtMax.value) {
        return;
      }

      const newZoom = Math.min(
        props.constraints.zoom.max,
        props.zoomLevel + props.constraints.zoom.step
      );

      emit('zoom-changed', {zoomLevel: newZoom});
    }

    // Step 4: Helper functions
    function formatDeviceLabel(device) {
      return device.label || `Camera ${device.deviceId.slice(0, 8)}`;
    }

    // Step 5: Return object - only what template needs
    return {
      // State
      pendingZoomValue,

      // Computed
      isZoomAtMin,
      isZoomAtMax,

      // Event handlers
      onDeviceChange,
      onTorchToggle,
      onZoomInput,
      onZoomChange,
      onZoomDecrease,
      onZoomIncrease,

      // Helpers
      formatDeviceLabel
    };
  }
};
</script>

<style scoped>
.camera-controls-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 8px;
  color: white;
  min-width: 200px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.control-label {
  font-size: 14px;
  font-weight: 600;
  color: #f0f0f0;
}

.device-selector {
  padding: 8px 12px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #333;
  color: white;
  font-size: 14px;
}

.device-selector:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.device-selector:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.control-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border: 1px solid #555;
  border-radius: 6px;
  background: #444;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.control-button:hover:not(:disabled) {
  background: #555;
  border-color: #666;
}

.control-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.torch-button.active {
  background: #ffa500;
  border-color: #ff8c00;
  color: #000;
}

.torch-button.active:hover:not(:disabled) {
  background: #ff8c00;
}

.torch-icon {
  font-size: 16px;
}

.torch-label {
  font-weight: 600;
}

.zoom-control {
  gap: 12px;
}

.zoom-slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 32px;
  border: 1px solid #555;
  border-radius: 4px;
  background: #444;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
}

.zoom-button:hover:not(:disabled) {
  background: #555;
}

.zoom-button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.zoom-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #555;
  outline: none;
  cursor: pointer;
}

.zoom-slider::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #007bff;
  cursor: pointer;
  transition: background 0.2s ease;
}

.zoom-slider::-webkit-slider-thumb:hover {
  background: #0056b3;
}

.zoom-slider:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.zoom-slider:disabled::-webkit-slider-thumb {
  cursor: not-allowed;
  background: #888;
}

.zoom-icon {
  font-size: 14px;
  line-height: 1;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .camera-controls-container {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 12px;
    padding: 12px;
  }

  .control-group {
    flex: 1;
    min-width: 150px;
  }

  .zoom-control {
    flex-basis: 100%;
  }

  .control-button {
    padding: 10px 12px;
    font-size: 13px;
  }

  .torch-icon {
    font-size: 14px;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .camera-controls-container {
    background: rgba(0, 0, 0, 0.8);
  }

  .device-selector {
    background: #222;
    border-color: #444;
  }

  .control-button {
    background: #333;
    border-color: #444;
  }

  .zoom-button {
    background: #333;
    border-color: #444;
  }

  .zoom-slider {
    background: #444;
  }
}
</style>
