<template>
  <div
    id="video-container"
    class="camera-video-container">
    <video
      ref="videoElement"
      autoplay
      playsinline
      muted
      class="camera-video"
      :class="{'stream-active': streamActive}" />
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {DEFAULT_CAMERA_CONSTRAINTS, DEFAULT_ZOOM_CONSTRAINTS} from
  '../../lib/utils/constants.js';
import {onBeforeUnmount, onMounted, reactive, ref} from 'vue';
import {cameraUtils} from '@bedrock/web-optical-scanner';

export default {
  name: 'CameraVideoComponent',
  props: {
    constraints: {
      type: Object,
      default: () => ({...DEFAULT_CAMERA_CONSTRAINTS})
    },
    deviceId: {
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
    autoStart: {
      type: Boolean,
      default: true
    }
  },
  emits: [
    'stream-ready',
    'camera-error',
    'capabilities-detected',
    'device-list-ready',
    'stream-stopped'
  ],
  setup(props, {emit, expose}) {
    // Step 1: Reactive state (primitives use ref, objects use reactive)
    const streamActive = ref(false);
    const loadingCamera = ref(false);
    const cameraError = ref(null);
    const deviceList = ref([]);

    // Objects use reactive
    const capabilities = reactive({
      zoom: false,
      torch: false
    });

    const constraints = reactive({
      zoom: {...DEFAULT_ZOOM_CONSTRAINTS}
    });

    // Step 2: Module-level variables for resources
    let stream = null;
    let abortController = new AbortController();

    // Step 3: Refs for DOM elements
    const videoElement = ref(null);

    // Step 4: Lifecycle hooks
    onMounted(() => {
      if(props.autoStart) {
        startCamera();
      }
    });

    onBeforeUnmount(() => {
      stopCamera();
    });

    // Step 5: Main camera functions
    async function startCamera({constraints: customConstraints} = {}) {
      if(streamActive.value) {
        stopCamera();
      }

      loadingCamera.value = true;
      cameraError.value = null;

      try {
        const finalConstraints = customConstraints || buildConstraints();

        // Use camera utils from bedrock-web-optical-scanner
        stream = await cameraUtils.startCameraStream(finalConstraints);

        // Attach to video element
        if(videoElement.value) {
          videoElement.value.srcObject = stream;

          // Wait for metadata
          await new Promise(resolve => {
            videoElement.value.onloadedmetadata = resolve;
          });

          streamActive.value = true;

          // Get capabilities and device list
          await Promise.all([
            getCapabilities(),
            getCameraList()
          ]);

          // Apply initial torch/zoom settings
          await applyInitialSettings();

          emit('stream-ready', {
            stream,
            videoElement: videoElement.value
          });
        }
      } catch(error) {
        console.error('Camera start error:', error);
        cameraError.value = getCameraErrorMessage(error);
        emit('camera-error', {
          error,
          code: error.name || 'UNKNOWN_ERROR'
        });
      } finally {
        loadingCamera.value = false;
      }
    }

    function stopCamera() {
      abortController.abort();
      abortController = new AbortController();

      streamActive.value = false;

      if(stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
      }

      if(videoElement.value) {
        videoElement.value.srcObject = null;
      }

      emit('stream-stopped');
    }

    async function captureFrame() {
      if(!videoElement.value || !streamActive.value) {
        throw new Error('No active video stream for capture');
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = videoElement.value.videoWidth;
      canvas.height = videoElement.value.videoHeight;

      ctx.drawImage(videoElement.value, 0, 0);

      return new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.8);
      });
    }

    // Step 6: Helper functions
    function buildConstraints() {
      const baseConstraints = {...props.constraints};

      if(props.deviceId) {
        baseConstraints.video = {
          ...baseConstraints.video,
          deviceId: {exact: props.deviceId}
        };
      }

      return baseConstraints;
    }

    async function getCameraList() {
      try {
        const devices = await cameraUtils.getCameraList();
        deviceList.value = devices;
        emit('device-list-ready', {devices});
      } catch(error) {
        console.error('Unable to get camera list:', error);
        deviceList.value = [];
      }
    }

    function getCapabilities() {
      if(!stream) {
        return;
      }

      const track = stream.getVideoTracks()[0];
      if(!track) {
        return;
      }

      const caps = track.getCapabilities();

      capabilities.zoom = !!caps.zoom;
      capabilities.torch = !!caps.torch;

      if(caps.zoom) {
        const {max = 8, min = 1, step = 1} = caps.zoom;
        constraints.zoom.min = min;
        constraints.zoom.max = max;
        constraints.zoom.step = step;
      }

      emit('capabilities-detected', {capabilities: {...capabilities}});
    }

    async function applyInitialSettings() {
      if(!stream) {
        return;
      }

      const track = stream.getVideoTracks()[0];
      if(!track) {
        return;
      }

      const advanced = [];

      if(props.torchOn && capabilities.torch) {
        advanced.push({torch: props.torchOn});
      }

      if(props.zoomLevel !== 1 && capabilities.zoom) {
        advanced.push({zoom: props.zoomLevel});
      }

      if(advanced.length > 0) {
        try {
          await track.applyConstraints({advanced});
        } catch(error) {
          console.error('Failed to apply initial settings:', error);
        }
      }
    }

    function getCameraErrorMessage(error) {
      if(error.name === 'NotAllowedError') {
        return 'Camera access denied. Please allow camera permissions.';
      }
      if(error.name === 'NotFoundError') {
        return 'No camera found on this device.';
      }
      if(error.name === 'NotReadableError') {
        return 'Camera is already in use by another application.';
      }
      return 'Camera access failed. Please try again.';
    }

    function getVideoElement() {
      return videoElement.value;
    }

    // Step 7: Expose methods for parent components
    expose({
      startCamera,
      stopCamera,
      captureFrame,
      getVideoElement
    });

    // Step 8: Return object - only what template needs
    return {
      videoElement,
      streamActive,
      loadingCamera,
      cameraError
    };
  }
};
</script>

<style scoped>
.camera-video-container {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.camera-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #000;
  transition: opacity 0.3s ease;
}

.camera-video:not(.stream-active) {
  opacity: 0.5;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .camera-video {
    object-fit: cover;
  }
}
</style>
