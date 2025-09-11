<template>
  <div
    v-if="visible && tipText"
    ref="tipContainer"
    :class="['tip-text-container', positionClass]"
    :style="computedStyle">
    
    <!-- Tip Text Content -->
    <div class="tip-text-content">
      <!-- Icon (optional) -->
      <div v-if="showIcon" class="tip-icon">
        {{ getPositionIcon() }}
      </div>
      
      <!-- Text Content -->
      <div class="tip-text" v-html="formattedText"></div>
      
      <!-- Optional close button for persistent tips -->
      <button
        v-if="showCloseButton"
        @click="hideTip"
        class="tip-close-button"
        title="Close tip">
        ✕
      </button>
    </div>
    
    <!-- Tip Arrow (for positioned tips) -->
    <div v-if="showArrow" class="tip-arrow"></div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { ref, computed, watch, nextTick } from 'vue';

export default {
  name: 'TipTextComponent',
  props: {
    tipText: {
      type: String,
      default: ''
    },
    position: {
      type: String,
      default: 'bottom',
      validator: (value) => ['top', 'bottom', 'center', 'custom'].includes(value)
    },
    regionTop: {
      type: Number,
      default: null
    },
    visible: {
      type: Boolean,
      default: true
    },
    customStyle: {
      type: Object,
      default: () => ({})
    },
    // Additional props for enhanced functionality
    showIcon: {
      type: Boolean,
      default: false
    },
    showArrow: {
      type: Boolean,
      default: false
    },
    showCloseButton: {
      type: Boolean,
      default: false
    },
    autoHide: {
      type: Boolean,
      default: false
    },
    autoHideDelay: {
      type: Number,
      default: 5000 // 5 seconds
    },
    animation: {
      type: String,
      default: 'fade',
      validator: (value) => ['fade', 'slide', 'bounce', 'none'].includes(value)
    },
    theme: {
      type: String,
      default: 'default',
      validator: (value) => ['default', 'dark', 'light', 'warning', 'error', 'success'].includes(value)
    }
  },
  emits: [
    'hidden',        // When tip is hidden (via close button or auto-hide)
    'shown',         // When tip becomes visible
    'clicked'        // When tip text is clicked
  ],
  setup(props, { emit }) {
    // Step 1: Reactive state
    const tipContainer = ref(null);
    const isManuallyHidden = ref(false);
    
    // Step 2: Auto-hide functionality
    let autoHideTimer = null;
    
    function startAutoHideTimer() {
      if (!props.autoHide || autoHideTimer) return;
      
      autoHideTimer = setTimeout(() => {
        hideTip();
      }, props.autoHideDelay);
    }
    
    function clearAutoHideTimer() {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer);
        autoHideTimer = null;
      }
    }
    
    // Step 3: Computed properties
    const formattedText = computed(() => {
      if (!props.tipText) return '';
      
      // Support for simple HTML formatting (bold, italic, line breaks)
      return props.tipText
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>');
    });
    
    const positionClass = computed(() => {
      return `tip-position-${props.position}`;
    });
    
    const computedStyle = computed(() => {
      const style = { ...props.customStyle };
      
      // Position-specific styling
      if (props.position === 'bottom' && props.regionTop !== null) {
        // Backward compatibility: position relative to scan region
        style.bottom = `calc(${props.regionTop}% - 30px)`;
        style.position = 'absolute';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
      } else if (props.position === 'top' && props.regionTop !== null) {
        // Position above scan region
        style.top = `calc(${100 - props.regionTop}% + 30px)`;
        style.position = 'absolute';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
      } else if (props.position === 'center') {
        style.position = 'absolute';
        style.top = '50%';
        style.left = '50%';
        style.transform = 'translate(-50%, -50%)';
      } else if (props.position === 'custom') {
        // Custom positioning via customStyle prop
        style.position = style.position || 'absolute';
      } else {
        // Default bottom positioning
        style.position = 'absolute';
        style.bottom = '20px';
        style.left = '50%';
        style.transform = 'translateX(-50%)';
      }
      
      // Theme-based styling
      const themeStyles = getThemeStyles();
      Object.assign(style, themeStyles);
      
      // Animation classes will be handled by CSS
      
      return style;
    });
    
    const actuallyVisible = computed(() => {
      return props.visible && !isManuallyHidden.value && props.tipText;
    });
    
    // Step 4: Helper functions
    function getPositionIcon() {
      const iconMap = {
        'top': '↑',
        'bottom': '↓',
        'center': '●',
        'custom': '📍'
      };
      return iconMap[props.position] || '💡';
    }
    
    function getThemeStyles() {
      const themes = {
        default: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderColor: 'transparent'
        },
        dark: {
          backgroundColor: 'rgba(33, 37, 41, 0.95)',
          color: '#f8f9fa',
          borderColor: '#495057'
        },
        light: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          color: '#212529',
          borderColor: '#dee2e6',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
        },
        warning: {
          backgroundColor: 'rgba(255, 193, 7, 0.95)',
          color: '#212529',
          borderColor: '#ffc107'
        },
        error: {
          backgroundColor: 'rgba(220, 53, 69, 0.95)',
          color: 'white',
          borderColor: '#dc3545'
        },
        success: {
          backgroundColor: 'rgba(40, 167, 69, 0.95)',
          color: 'white',
          borderColor: '#28a745'
        }
      };
      
      return themes[props.theme] || themes.default;
    }
    
    function hideTip() {
      isManuallyHidden.value = true;
      clearAutoHideTimer();
      emit('hidden');
    }
    
    function showTip() {
      isManuallyHidden.value = false;
      if (props.autoHide) {
        nextTick(() => {
          startAutoHideTimer();
        });
      }
      emit('shown');
    }
    
    function onTipClick() {
      emit('clicked');
    }
    
    // Step 5: Watchers
    watch(actuallyVisible, (isVisible) => {
      if (isVisible) {
        if (props.autoHide) {
          nextTick(() => {
            startAutoHideTimer();
          });
        }
        emit('shown');
      } else {
        clearAutoHideTimer();
      }
    }, { immediate: true });
    
    watch(() => props.visible, (isVisible) => {
      if (isVisible) {
        // Reset manual hide when visibility is toggled back on
        isManuallyHidden.value = false;
      }
    });
    
    // Step 6: Lifecycle cleanup
    const cleanup = () => {
      clearAutoHideTimer();
    };
    
    // Return cleanup function for parent to call if needed
    const beforeUnmount = () => {
      cleanup();
    };
    
    // Step 7: Return reactive state and methods for template
    return {
      tipContainer,
      formattedText,
      positionClass,
      computedStyle,
      actuallyVisible,
      getPositionIcon,
      hideTip,
      showTip,
      onTipClick,
      beforeUnmount
    };
  },
  beforeUnmount() {
    this.beforeUnmount();
  }
};
</script>

<style scoped>
.tip-text-container {
  z-index: 1000;
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 90vw;
  word-wrap: break-word;
}

.tip-text-content {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  cursor: pointer;
}

.tip-text-content:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.tip-icon {
  font-size: 16px;
  opacity: 0.9;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  line-height: 1.4;
  text-align: center;
  flex: 1;
}

.tip-close-button {
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  opacity: 0.7;
  transition: opacity 0.2s ease;
  flex-shrink: 0;
  margin-left: 4px;
}

.tip-close-button:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

/* Tip Arrow */
.tip-arrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
}

/* Arrow positioning based on tip position */
.tip-position-top .tip-arrow {
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 8px 8px 0 8px;
  border-color: currentColor transparent transparent transparent;
}

.tip-position-bottom .tip-arrow {
  top: -8px;
  left: 50%;
  transform: translateX(-50%);
  border-width: 0 8px 8px 8px;
  border-color: transparent transparent currentColor transparent;
}

.tip-position-center .tip-arrow {
  display: none; /* No arrow for center position */
}

/* Animation Classes */
.tip-text-container {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}

/* Fade Animation */
.tip-text-container {
  animation-name: tipFadeIn;
}

@keyframes tipFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Slide Animation for bottom position */
.tip-position-bottom.tip-text-container {
  animation-name: tipSlideUp;
}

@keyframes tipSlideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Slide Animation for top position */
.tip-position-top.tip-text-container {
  animation-name: tipSlideDown;
}

@keyframes tipSlideDown {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

/* Bounce Animation */
.tip-text-container.animation-bounce {
  animation-name: tipBounceIn;
  animation-duration: 0.5s;
}

@keyframes tipBounceIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.3);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scale(1.05);
  }
  70% {
    transform: translateX(-50%) scale(0.9);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1);
  }
}

/* Mobile Responsiveness */
@media (max-width: 768px) {
  .tip-text-container {
    max-width: 95vw;
  }
  
  .tip-text-content {
    padding: 10px 14px;
    font-size: 13px;
  }
  
  .tip-text {
    font-size: 13px;
    line-height: 1.3;
  }
  
  .tip-icon {
    font-size: 14px;
  }
  
  /* Adjust positioning for mobile */
  .tip-position-bottom {
    bottom: 10px !important;
  }
  
  .tip-position-top {
    top: 10px !important;
  }
}

@media (max-width: 480px) {
  .tip-text-content {
    padding: 8px 12px;
  }
  
  .tip-text {
    font-size: 12px;
  }
  
  .tip-close-button {
    font-size: 14px;
    padding: 2px;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .tip-text-content {
    border-width: 2px;
    box-shadow: 0 0 0 1px currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .tip-text-container {
    animation: none !important;
  }
  
  .tip-text-content {
    transition: none !important;
  }
  
  .tip-text-content:hover {
    transform: none !important;
  }
}

/* Print styles */
@media print {
  .tip-text-container {
    display: none;
  }
}
</style>