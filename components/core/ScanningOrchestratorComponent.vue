<!--
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
-->

<script>
/*!
 * ScanningOrchestratorComponent.vue
 *
 * Renderless Vue component that bridges Vue reactivity with
 * bedrock-web-optical-scanner.
 * Handles all scanning logic, plugin management, and lifecycle orchestration.
 *
 * Key responsibilities:
 * - Create and manage OpticalScanner instance
 * - Auto-register plugins based on formats prop
 * - Handle continuous scanning with proper intervals
 * - Provide scan cancellation via AbortController
 * - Emit Vue events for scan results, errors, and progress
 * - Manage scanner lifecycle (create/destroy with component)
 */

import {
  enhancedPdf417Plugin,
  mrzPlugin,
  OpticalScanner,
  pdf417Plugin,
  qrCodePlugin
} from '@bedrock/web-optical-scanner';
import {nextTick, onMounted, onUnmounted, ref, watch} from 'vue';

export default {
  name: 'ScanningOrchestratorComponent',

  props: {
    source: {
      type: [HTMLVideoElement, HTMLImageElement, File, Blob],
      default: null
    },
    formats: {
      type: Array,
      default: () => ['qr_code']
    },
    mode: {
      type: String,
      default: 'first',
      validator: value => ['first', 'all', 'exhaustive'].includes(value)
    },
    pluginOptions: {
      type: Object,
      default: () => ({})
    },
    continuous: {
      type: Boolean,
      default: false
    },
    scanInterval: {
      type: Number,
      default: 1000 // ms
    }
  },

  emits: [
    'result', // { results: Array, source: any }
    'error', // { error: Error, source: any, type: string }
    'progress', // { scanning: boolean, format: string }
    'scan-complete' // { successful: boolean, resultCount: number }
  ],

  setup(props, {emit, expose}) {
    // Step 1: Reactive state
    const scanning = ref(false);
    const scanningFormat = ref(null);

    // Step 2: Module-level variables for resources
    let scanner = null;
    let abortController = null;
    let continuousTimer = null;
    let lastSource = null;

    // Step 3: Available plugins mapping
    const AVAILABLE_PLUGINS = {
      qr_code: qrCodePlugin,
      pdf417: pdf417Plugin,
      pdf417_enhanced: enhancedPdf417Plugin,
      mrz: mrzPlugin
    };

    // Step 4: Scanner instance management
    function createScanner() {
      // Get plugins for current formats
      const plugins = props.formats
        .filter(format => AVAILABLE_PLUGINS[format])
        .map(format => AVAILABLE_PLUGINS[format]);

      if(plugins.length === 0) {
        console.warn(
          'ScanningOrchestrator: No valid plugins found for formats:',
          props.formats
        );
        return null;
      }

      try {
        return new OpticalScanner({
          plugins,
          ...props.pluginOptions
        });
      } catch(error) {
        console.error('ScanningOrchestrator: Failed to create scanner:', error);
        emit('error', {
          error,
          source: props.source,
          type: 'scanner_creation'
        });
        return null;
      }
    }

    function recreateScanner() {
      // Clean up existing scanner
      if(scanner) {
        scanner = null;
      }

      // Create new scanner with current formats
      scanner = createScanner();
    }

    // Step 5: Core scanning functionality
    async function performScan(sourceToScan = null, options = {}) {
      const scanSource = sourceToScan || props.source;

      if(!scanSource) {
        const error = new Error('No scan source provided');
        emit('error', {
          error,
          source: scanSource,
          type: 'no_source'
        });
        return [];
      }

      if(!scanner) {
        const error = new Error('Scanner not initialized');
        emit('error', {
          error,
          source: scanSource,
          type: 'scanner_not_ready'
        });
        return [];
      }

      // Create abort controller for this scan
      abortController = new AbortController();

      try {
        scanning.value = true;
        // Show first format as scanning
        scanningFormat.value = props.formats[0];

        emit('progress', {
          scanning: true,
          format: scanningFormat.value
        });

        // Perform the scan with abort signal
        const results = await scanner.scan(scanSource, {
          formats: props.formats,
          mode: props.mode,
          signal: abortController.signal,
          ...options
        });

        // Emit successful results
        emit('result', {
          results,
          source: scanSource
        });

        emit('scan-complete', {
          successful: true,
          resultCount: results.length
        });

        return results;

      } catch(error) {
        // Handle different error types
        let errorType = 'scan_error';

        if(error.name === 'AbortError') {
          errorType = 'scan_aborted';
        } else if(error.message?.includes('no results')) {
          errorType = 'no_results';
          // Don't emit no_results as errors - this is normal behavior
          console.log('No scan results found - normal in continuous mode');
          emit('scan-complete', {
            successful: false,
            resultCount: 0
          });

          return []; // Exit without emitting error
        } else if(error.message?.includes('source')) {
          errorType = 'invalid_source';
        }

        emit('error', {
          error,
          source: scanSource,
          type: errorType
        });

        emit('scan-complete', {
          successful: false,
          resultCount: 0
        });

        return [];

      } finally {
        scanning.value = false;
        scanningFormat.value = null;
        abortController = null;

        emit('progress', {
          scanning: false,
          format: null
        });
      }
    }

    // Step 6: Continuous scanning management
    function startContinuousScanning() {
      if(continuousTimer || !props.continuous) {
        return;
      }

      // Start continuous scanning loop
      continuousTimer = setInterval(() => {
        // Only scan if source is available and we're not already scanning
        if(props.source && !scanning.value) {
          performScan();
        }
      }, props.scanInterval);
    }

    function stopContinuousScanning() {
      if(continuousTimer) {
        clearInterval(continuousTimer);
        continuousTimer = null;
      }
    }

    // Step 7: Scan abortion
    function abortCurrentScan() {
      if(abortController) {
        abortController.abort();
        abortController = null;
      }

      scanning.value = false;
      scanningFormat.value = null;

      emit('progress', {
        scanning: false,
        format: null
      });
    }

    // Step 8: Exposed methods
    const scanMethod = (sourceOverride = null) => {
      return performScan(sourceOverride);
    };

    const startContinuous = () => {
      startContinuousScanning();
    };

    const stopContinuous = () => {
      stopContinuousScanning();
      abortCurrentScan();
    };

    const abortScan = () => {
      abortCurrentScan();
    };

    // Step 9: Watchers for reactive behavior

    // Recreate scanner when formats change
    watch(() => props.formats, () => {
      recreateScanner();
    }, {deep: true});

    // Recreate scanner when plugin options change
    watch(() => props.pluginOptions, () => {
      recreateScanner();
    }, {deep: true});

    // Handle source changes for continuous scanning
    watch(() => props.source, (newSource, oldSource) => {
      lastSource = newSource;

      // If continuous mode and source changed, trigger scan
      if(
        props.continuous &&
        newSource &&
        newSource !== oldSource &&
        !scanning.value
      ) {
        nextTick(() => {
          performScan();
        });
      }
    });

    // Handle continuous mode changes
    watch(() => props.continuous, isContinuous => {
      if(isContinuous) {
        startContinuousScanning();
      } else {
        stopContinuousScanning();
      }
    });

    // Handle scan interval changes
    watch(() => props.scanInterval, () => {
      if(props.continuous) {
        stopContinuousScanning();
        startContinuousScanning();
      }
    });

    // Step 10: Lifecycle management
    onMounted(() => {
      // Create initial scanner
      recreateScanner();

      // Start continuous scanning if enabled
      if(props.continuous) {
        startContinuousScanning();
      }
    });

    onUnmounted(() => {
      // Clean up all resources
      stopContinuousScanning();
      abortCurrentScan();

      if(scanner) {
        scanner = null;
      }
    });

    // Step 11: Expose methods to parent
    expose({
      scan: scanMethod,
      startContinuous,
      stopContinuous,
      abortScan
    });

    // Step 12: Return for template (renderless component)
    return {
      // Only expose scanning state for debugging purposes
      // This component is renderless, so these aren't used in template
      scanning: scanning.value,
      scanningFormat: scanningFormat.value
    };
  }
};
</script>

<!-- Renderless component - no template needed -->
<template>
  <div style="display:none" />
</template>
