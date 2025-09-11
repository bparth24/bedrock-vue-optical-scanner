/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

// Core modular components
export {default as CameraVideoComponent} from './core/CameraVideoComponent.vue';
export {default as CameraControlsComponent}
  from './core/CameraControlsComponent.vue';
export {default as ScannerControlsComponent}
  from './core/ScannerControlsComponent.vue';
export {default as UploadComponent} from
  './core/UploadComponent.vue';
export {default as RegionOverlayComponent} from
  './core/RegionOverlayComponent.vue';
export {default as LoadingOverlayComponent} from
  './core/LoadingOverlayComponent.vue';
export {default as ErrorDisplayComponent} from
  './core/ErrorDisplayComponent.vue';
export {default as ResultsDisplayComponent} from
  './core/ResultsDisplayComponent.vue';
export {default as TipTextComponent} from './core/TipTextComponent.vue';
export {default as LicenseManagerComponent} from
  './core/LicenseManagerComponent.vue';
export {default as ScanningOrchestratorComponent} from
  './core/ScanningOrchestratorComponent.vue';

// All-in-one component for backward compatibility
export {default as OpticalScannerComponent} from
  './OpticalScannerComponent.vue';

// Convenience exports for common combinations
export {
  CameraVideoComponent as Camera,
  CameraControlsComponent as CameraControls,
  ScannerControlsComponent as ScannerControls,
  UploadComponent as Upload,
  ResultsDisplayComponent as Results,
  OpticalScannerComponent as OpticalScanner
} from './index.js';
