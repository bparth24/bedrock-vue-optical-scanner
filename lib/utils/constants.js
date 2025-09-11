/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */

/**
 * Available optical scanning formats.
 */
export const AVAILABLE_FORMATS = [
  'qr_code',
  'pdf417',
  'pdf417_enhanced',
  'mrz'
];

/**
 * Format display labels.
 */
export const FORMAT_LABELS = {
  qr_code: 'QR Code',
  pdf417: 'PDF417',
  pdf417_enhanced: 'PDF417 Enhanced',
  mrz: 'MRZ'
};

/**
 * Scanning modes.
 */
export const SCAN_MODES = ['first', 'all', 'exhaustive'];

/**
 * Default camera constraints.
 */
export const DEFAULT_CAMERA_CONSTRAINTS = {
  audio: false,
  video: {
    facingMode: 'environment',
    width: {ideal: 1280},
    height: {ideal: 720}
  }
};

/**
 * Default zoom constraints.
 */
export const DEFAULT_ZOOM_CONSTRAINTS = {
  min: 1,
  max: 8,
  step: 1
};

/**
 * Accepted file types for upload.
 */
export const ACCEPTED_FILE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/bmp',
  'image/gif'
];
