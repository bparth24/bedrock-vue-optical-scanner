<template>
  <div 
    ref="overlayContainer"
    class="region-overlay-container"
    :style="containerStyle">
    
    <!-- Canvas Overlay for PDF417 Region Masking -->
    <canvas
      v-if="regionStyle !== 'none'"
      ref="maskCanvas"
      class="region-mask-canvas"
      :style="canvasStyle"
      @resize="handleResize" />
    
    <!-- QR Box Overlay (CSS-based) -->
    <div
      v-if="showQrBox && regionStyle !== 'none'"
      class="qr-box-overlay"
      :style="qrBoxStyle">
      <div class="qr-box-corner qr-box-corner--tl"></div>
      <div class="qr-box-corner qr-box-corner--tr"></div>
      <div class="qr-box-corner qr-box-corner--bl"></div>
      <div class="qr-box-corner qr-box-corner--br"></div>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import { nextTick } from 'vue';

export default {
  name: 'RegionOverlayComponent',
  props: {
    showQrBox: {
      type: Boolean,
      default: false
    },
    regionScale: {
      type: Number,
      default: 0.4
    },
    guideColor: {
      type: String,
      default: 'rgb(254, 142, 20)'
    },
    clientWidth: {
      type: Number,
      required: true
    },
    clientHeight: {
      type: Number,
      required: true
    },
    regionStyle: {
      type: String,
      default: 'square', // 'square', 'rectangle', 'none'
      validator: (value) => ['square', 'rectangle', 'none'].includes(value)
    }
  },
  emits: [
    'region-calculated'  // { region: Object }
  ],
  data() {
    return {
      // Canvas context for region masking
      maskCanvasContext: null,
      // Resize observer for responsive updates
      resizeObserver: null
    };
  },
  computed: {
    // Region mask edge length calculation (from existing logic)
    regionMaskEdgeLength() {
      const regionMaskEdgeLength = 
        this.regionScale * Math.min(this.clientWidth, this.clientHeight);
      return Math.floor(regionMaskEdgeLength);
    },

    // Region left position (from existing logic)
    regionLeft() {
      const left = 
        (this.clientWidth - this.regionMaskEdgeLength) / 2 / this.clientWidth;
      if(this.clientWidth > this.clientHeight) {
        // this creates a percentage
        return Math.round(left * 100) - 25;
      } else {
        // this creates a percentage  
        return Math.round(left * 100) - 20;
      }
    },

    // Region top position (from existing logic)
    regionTop() {
      const top = 
        (this.clientHeight - this.regionMaskEdgeLength) / 2 / this.clientHeight;
      // this creates a percentage
      return Math.round(top * 100) - 5;
    },

    // Complete region object (from existing logic)
    region() {
      const region = {
        // regions are calculated by percent
        regionLeft: Math.max(0, this.regionLeft),
        regionRight: Math.min(100, 100 - this.regionLeft),
        regionTop: Math.max(0, this.regionTop),
        regionBottom: Math.min(100, 100 - this.regionTop),
        regionMeasuredByPercentage: 1,
      };
      return region;
    },

    // Container positioning styles
    containerStyle() {
      return {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10
      };
    },

    // Canvas positioning and sizing
    canvasStyle() {
      return {
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        height: '100%',
        pointerEvents: 'none'
      };
    },

    // QR box positioning and styling
    qrBoxStyle() {
      if(!this.showQrBox) return { display: 'none' };
      
      const { regionLeft, regionTop } = this.region;
      const regionWidth = 100 - (2 * Math.max(0, this.regionLeft));
      const regionHeight = 100 - (2 * Math.max(0, this.regionTop));
      
      return {
        position: 'absolute',
        left: `${regionLeft}%`,
        top: `${regionTop}%`,
        width: `${regionWidth}%`,
        height: `${regionHeight}%`,
        border: `2px solid ${this.guideColor}`,
        borderRadius: '8px',
        pointerEvents: 'none'
      };
    }
  },
  watch: {
    // Watch for region changes and emit to parent
    region: {
      handler(newRegion) {
        this.$emit('region-calculated', { region: newRegion });
      },
      deep: true,
      immediate: true
    },

    // Redraw canvas when properties change
    clientWidth() {
      this.$nextTick(() => this.drawRegion());
    },
    clientHeight() {
      this.$nextTick(() => this.drawRegion());
    },
    regionScale() {
      this.$nextTick(() => this.drawRegion());
    },
    guideColor() {
      this.$nextTick(() => this.drawRegion());
    },
    regionStyle() {
      this.$nextTick(() => this.drawRegion());
    }
  },
  async mounted() {
    await this.initializeCanvas();
    this.setupResizeObserver();
    this.drawRegion();
  },
  beforeUnmount() {
    this.cleanupResizeObserver();
  },
  methods: {
    // Initialize canvas for region masking (from existing cvsDrawArea logic)
    async initializeCanvas() {
      await nextTick();
      
      if(!this.$refs.maskCanvas) {
        return;
      }

      const canvas = this.$refs.maskCanvas;
      this.maskCanvasContext = canvas.getContext('2d');
      
      // Set canvas size to match container
      canvas.width = this.clientWidth;
      canvas.height = this.clientHeight;
    },

    // Draw region overlay (enhanced from existing cvsDrawArea method)
    drawRegion() {
      if(!this.maskCanvasContext || this.regionStyle === 'none') {
        return;
      }

      const canvas = this.$refs.maskCanvas;
      const ctx = this.maskCanvasContext;
      
      // Update canvas size
      canvas.width = this.clientWidth;
      canvas.height = this.clientHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw semi-transparent overlay
      ctx.fillStyle = 'rgba(0,0,0,.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Cut out the scanning region
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'white';
      
      const regionLeftPx = (this.region.regionLeft / 100) * canvas.width;
      const regionTopPx = (this.region.regionTop / 100) * canvas.height;
      const regionWidthPx = ((100 - 2 * Math.max(0, this.regionLeft)) / 100) * canvas.width;
      const regionHeightPx = ((100 - 2 * Math.max(0, this.regionTop)) / 100) * canvas.height;
      
      // Draw clear region based on style
      if(this.regionStyle === 'square') {
        const size = Math.min(regionWidthPx, regionHeightPx);
        const adjustedLeft = regionLeftPx + (regionWidthPx - size) / 2;
        const adjustedTop = regionTopPx + (regionHeightPx - size) / 2;
        ctx.fillRect(adjustedLeft, adjustedTop, size, size);
      } else if(this.regionStyle === 'rectangle') {
        ctx.fillRect(regionLeftPx, regionTopPx, regionWidthPx, regionHeightPx);
      }
      
      // Draw region border
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 2;
      ctx.strokeStyle = this.guideColor;
      
      if(this.regionStyle === 'square') {
        const size = Math.min(regionWidthPx, regionHeightPx);
        const adjustedLeft = regionLeftPx + (regionWidthPx - size) / 2;
        const adjustedTop = regionTopPx + (regionHeightPx - size) / 2;
        ctx.strokeRect(adjustedLeft, adjustedTop, size, size);
      } else if(this.regionStyle === 'rectangle') {
        ctx.strokeRect(regionLeftPx, regionTopPx, regionWidthPx, regionHeightPx);
      }
    },

    // Setup resize observer for responsive updates
    setupResizeObserver() {
      if(!window.ResizeObserver || !this.$refs.overlayContainer) {
        return;
      }

      this.resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      
      this.resizeObserver.observe(this.$refs.overlayContainer);
    },

    // Handle resize events
    handleResize() {
      this.$nextTick(() => {
        this.drawRegion();
      });
    },

    // Cleanup resize observer
    cleanupResizeObserver() {
      if(this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    },

    // Exposed method: Get current region
    getRegion() {
      return this.region;
    },

    // Exposed method: Manually trigger region redraw
    drawRegionExposed() {
      this.drawRegion();
    }
  },

  // Expose methods to parent components
  expose: ['getRegion', 'drawRegionExposed']
};
</script>

<style scoped>
.region-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

.region-mask-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.qr-box-overlay {
  position: absolute;
  pointer-events: none;
  border-radius: 8px;
}

/* QR Box Corner Indicators */
.qr-box-corner {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 3px solid;
  border-color: inherit;
}

.qr-box-corner--tl {
  top: -3px;
  left: -3px;
  border-right: none;
  border-bottom: none;
}

.qr-box-corner--tr {
  top: -3px;
  right: -3px;
  border-left: none;
  border-bottom: none;
}

.qr-box-corner--bl {
  bottom: -3px;
  left: -3px;
  border-right: none;
  border-top: none;
}

.qr-box-corner--br {
  bottom: -3px;
  right: -3px;
  border-left: none;
  border-top: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .qr-box-corner {
    width: 16px;
    height: 16px;
    border-width: 2px;
  }
}
</style>