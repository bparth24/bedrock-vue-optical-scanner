/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

// Export all components
export * from '../components/index.js';

// Export utilities and constants
export * from './utils/constants.js';

// Re-export from bedrock-web-optical-scanner for convenience
export {
  OpticalScanner as WebOpticalScanner,
  qrCodePlugin,
  pdf417Plugin,
  enhancedPdf417Plugin,
  mrzPlugin,
  cameraUtils,
  createPlugin
} from '@bedrock/web-optical-scanner';

// Default export for CommonJS compatibility
import {OpticalScannerComponent} from '../components/index.js';
export default OpticalScannerComponent;
