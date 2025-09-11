<template>
  <div
    v-if="showOverlay"
    class="loading-overlay-container"
    :class="overlayClasses">
    
    <!-- Camera Loading State -->
    <div
      v-if="loadingCamera"
      class="loading-state camera-loading">
      
      <!-- Custom Camera Spinner Slot -->
      <div class="spinner-container">
        <slot name="cameraSpinner">
          <div class="default-spinner" :class="spinnerClasses">
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
            <div class="spinner-ring"></div>
          </div>
        </slot>
      </div>
      
      <!-- Loading Text -->
      <div class="loading-text camera-text">
        {{ loadingText }}
      </div>
    </div>
    
    <!-- Scanning State -->
    <div
      v-if="scanning && !loadingCamera"
      class="loading-state scanning-loading">
      
      <!-- Custom Scanner Spinner Slot -->
      <div class="spinner-container">
        <slot name="scannerSpinner">
          <div class="default-spinner" :class="spinnerClasses">
            <div class="spinner-pulse"></div>
          </div>
        </slot>
      </div>
      
      <!-- Scanning Text -->
      <div class="loading-text scanning-text">
        {{ scanningText }}
      </div>
    </div>
    
    <!-- Custom Content Slot -->
    <slot
      v-if="!loadingCamera && !scanning"
      name="loadingContent">
      <!-- Fallback if slot is used but no specific loading state -->
      <div class="loading-state generic-loading">
        <div class="spinner-container">
          <div class="default-spinner" :class="spinnerClasses">
            <div class="spinner-ring"></div>
          </div>
        </div>
        <div class="loading-text">
          Loading...
        </div>
      </div>
    </slot>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
export default {
  name: 'LoadingOverlayComponent',
  props: {
    loadingCamera: {
      type: Boolean,
      default: false
    },
    scanning: {
      type: Boolean,
      default: false
    },
    loadingText: {
      type: String,
      default: 'Loading Camera...'
    },
    scanningText: {
      type: String,
      default: 'Scanning...'
    },
    spinnerType: {
      type: String,
      default: 'default' // 'default', 'pulse', 'dots', 'minimal'
    },
    overlayBackground: {
      type: String,
      default: 'dark' // 'dark', 'light', 'transparent'
    },
    size: {
      type: String,
      default: 'medium' // 'small', 'medium', 'large'
    },
    position: {
      type: String,
      default: 'center' // 'center', 'top', 'bottom'
    }
  },
  computed: {
    // Show overlay if any loading state is active or slots are being used
    showOverlay() {
      return this.loadingCamera || 
             this.scanning || 
             this.$slots.loadingContent;
    },
    
    // Overlay styling classes
    overlayClasses() {
      return [
        `overlay-bg-${this.overlayBackground}`,
        `overlay-pos-${this.position}`,
        `overlay-size-${this.size}`
      ];
    },
    
    // Spinner styling classes
    spinnerClasses() {
      return [
        `spinner-type-${this.spinnerType}`,
        `spinner-size-${this.size}`
      ];
    }
  }
};
</script>

<style scoped>
/* Base Overlay Container */
.loading-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: none;
}

/* Background Variations */
.overlay-bg-dark {
  background: rgba(0, 0, 0, 0.7);
}

.overlay-bg-light {
  background: rgba(255, 255, 255, 0.9);
}

.overlay-bg-transparent {
  background: transparent;
}

/* Position Variations */
.overlay-pos-center {
  align-items: center;
  justify-content: center;
}

.overlay-pos-top {
  align-items: flex-start;
  justify-content: center;
  padding-top: 20%;
}

.overlay-pos-bottom {
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 20%;
}

/* Loading State Container */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 300px;
  padding: 20px;
}

/* Spinner Container */
.spinner-container {
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Default Spinner Styles */
.default-spinner {
  position: relative;
  display: inline-block;
}

/* Size Variations */
.spinner-size-small {
  width: 24px;
  height: 24px;
}

.spinner-size-medium {
  width: 40px;
  height: 40px;
}

.spinner-size-large {
  width: 56px;
  height: 56px;
}

/* Spinner Type: Default (Rings) */
.spinner-type-default .spinner-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-top: 3px solid #fff;
  border-radius: 50%;
  animation: spin 1.2s linear infinite;
}

.spinner-type-default .spinner-ring:nth-child(1) {
  animation-delay: 0s;
}

.spinner-type-default .spinner-ring:nth-child(2) {
  animation-delay: -0.4s;
  transform: scale(0.8);
  border-top-color: rgba(255, 255, 255, 0.7);
}

.spinner-type-default .spinner-ring:nth-child(3) {
  animation-delay: -0.8s;
  transform: scale(0.6);
  border-top-color: rgba(255, 255, 255, 0.4);
}

/* Spinner Type: Pulse */
.spinner-type-pulse .spinner-pulse {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

/* Spinner Type: Dots */
.spinner-type-dots {
  display: flex;
  gap: 4px;
}

.spinner-type-dots .spinner-dot {
  width: 8px;
  height: 8px;
  background: #fff;
  border-radius: 50%;
  animation: bounce 1.4s ease-in-out infinite both;
}

.spinner-type-dots .spinner-dot:nth-child(1) { animation-delay: -0.32s; }
.spinner-type-dots .spinner-dot:nth-child(2) { animation-delay: -0.16s; }
.spinner-type-dots .spinner-dot:nth-child(3) { animation-delay: 0s; }

/* Spinner Type: Minimal */
.spinner-type-minimal .spinner-ring {
  width: 100%;
  height: 100%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-top: 2px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

/* Loading Text Styles */
.loading-text {
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.4;
  margin: 0;
}

.overlay-bg-light .loading-text {
  color: #333;
}

/* Size-specific text adjustments */
.overlay-size-small .loading-text {
  font-size: 14px;
}

.overlay-size-large .loading-text {
  font-size: 18px;
  font-weight: 600;
}

/* State-specific styling */
.camera-loading {
  /* Camera loading specific styles */
}

.scanning-loading {
  /* Scanning specific styles */
}

.camera-text {
  /* Camera text specific styles */
}

.scanning-text {
  /* Scanning text specific styles */
  color: #4caf50;
  font-weight: 600;
}

.overlay-bg-dark .scanning-text {
  color: #81c784;
}

/* Animations */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .loading-state {
    max-width: 250px;
    padding: 16px;
  }
  
  .loading-text {
    font-size: 14px;
  }
  
  .overlay-size-large .loading-text {
    font-size: 16px;
  }
}

/* Safe area adjustments for mobile */
@media (max-width: 480px) {
  .overlay-pos-top {
    padding-top: calc(env(safe-area-inset-top, 0px) + 60px);
  }
  
  .overlay-pos-bottom {
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 60px);
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .spinner-ring,
  .spinner-pulse,
  .spinner-dot {
    border-color: #000 !important;
    background: #000 !important;
  }
  
  .overlay-bg-dark {
    background: rgba(0, 0, 0, 0.9);
  }
  
  .loading-text {
    font-weight: bold;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .spinner-ring,
  .spinner-pulse,
  .spinner-dot {
    animation-duration: 3s;
  }
}
</style>