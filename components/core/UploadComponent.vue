<template>
  <div class="upload-component-container">
    <!-- Hidden File Input -->
    <input
      ref="fileInput"
      type="file"
      :accept="acceptedTypesString"
      :disabled="disabled"
      multiple
      style="display: none"
      @change="onFileSelect">

    <!-- Upload Button (if not hidden) -->
    <button
      v-if="!hideUploadButton"
      :disabled="disabled"
      :class="['upload-button', { 'drag-over': isDragOver }]"
      @click="triggerFileSelect">
      <span class="upload-icon">📁</span>
      <span class="upload-text">{{uploadButtonText}}</span>
    </button>

    <!-- Drag & Drop Area (if enabled) -->
    <div
      v-if="dragDrop && !hideUploadButton"
      :class="['drag-drop-area', {
        'drag-over': isDragOver,
        'disabled': disabled
      }]"
      @click="triggerFileSelect"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop">
      <div class="drag-content">
        <span class="drag-icon">{{isDragOver ? '📂' : '📋'}}</span>
        <div class="drag-text">
          <strong>
            {{isDragOver? 'Drop files here': 'Drag & drop files'}}
          </strong>
          <small>or click to browse</small>
        </div>
        <div class="drag-formats">
          Accepted: {{acceptedTypesDisplay}}
        </div>
      </div>
    </div>

    <!-- Upload Progress (if files are being processed) -->
    <div
      v-if="processing.length > 0"
      class="upload-progress">
      <h4>Processing Files:</h4>
      <div
        v-for="item in processing"
        :key="item.id"
        class="progress-item">
        <span class="file-name">{{item.file.name}}</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: item.progress + '%' }" />
        </div>
        <span class="progress-text">{{item.progress}}%</span>
      </div>
    </div>

    <!-- Recently Uploaded Files -->
    <div
      v-if="recentFiles.length > 0 && showRecentFiles"
      class="recent-files">
      <h4>Recent Uploads:</h4>
      <div
        v-for="file in recentFiles.slice(0, maxRecentFiles)"
        :key="file.id"
        class="recent-file-item">
        <div class="file-info">
          <span class="file-name">{{file.name}}</span>
          <span class="file-size">({{formatFileSize(file.size)}})</span>
        </div>

        <!-- Thumbnail for images -->
        <div
          v-if="file.preview"
          class="file-preview">
          <img
            :src="file.preview"
            alt="Preview">
        </div>

        <div class="file-actions">
          <button
            class="action-button scan-again"
            @click="reScanFile(file)">
            🔍 Scan Again
          </button>
          <button
            class="action-button remove"
            @click="removeRecentFile(file.id)">
            ❌ Remove
          </button>
        </div>
      </div>
    </div>

    <!-- Error Display -->
    <div
      v-if="uploadError"
      class="upload-error">
      <span class="error-icon">⚠️</span>
      <span class="error-message">{{uploadError}}</span>
      <button
        class="error-dismiss"
        @click="clearError">
        ×
      </button>
    </div>
  </div>
</template>

<script>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {computed, ref} from 'vue';
import {ACCEPTED_FILE_TYPES} from '../../lib/utils/constants.js';

export default {
  name: 'UploadComponent',
  props: {
    hideUploadButton: {
      type: Boolean,
      default: false
    },
    acceptedTypes: {
      type: Array,
      default: () => [...ACCEPTED_FILE_TYPES]
    },
    disabled: {
      type: Boolean,
      default: false
    },
    maxFileSize: {
      type: Number,
      default: 10 * 1024 * 1024 // 10MB
    },
    dragDrop: {
      type: Boolean,
      default: true
    },
    showRecentFiles: {
      type: Boolean,
      default: true
    },
    maxRecentFiles: {
      type: Number,
      default: 3
    },
    uploadButtonText: {
      type: String,
      default: 'Upload Image'
    }
  },
  emits: [
    'file-uploaded',
    'upload-error',
    'upload-progress',
    'files-processed'
  ],
  setup(props, {emit}) {
    // Step 1: Reactive state
    const fileInput = ref(null);
    const isDragOver = ref(false);
    const processing = ref([]);
    const recentFiles = ref([]);
    const uploadError = ref(null);

    // Step 2: Computed properties
    const acceptedTypesString = computed(() =>
      props.acceptedTypes.join(',')
    );

    const acceptedTypesDisplay = computed(() =>
      props.acceptedTypes
        .map(type => type.split('/')[1].toUpperCase())
        .join(', ')
    );

    // Step 3: File handling functions
    async function processFiles(files) {
      const fileArray = Array.from(files);
      const validFiles = [];

      // Validate files
      for(const file of fileArray) {
        const validation = validateFile(file);
        if(!validation.valid) {
          setError(validation.error);
          continue;
        }
        validFiles.push(file);
      }

      if(validFiles.length === 0) {
        return;
      }

      // Process each valid file
      for(const file of validFiles) {
        await processFile(file);
      }
    }

    async function processFile(file) {
      const processingId = Date.now() + Math.random();

      // Add to processing list
      const processingItem = {
        id: processingId,
        file,
        progress: 0
      };
      processing.value.push(processingItem);

      try {
        // Simulate progress (in real app, this would be actual file processing)
        for(let progress = 0; progress <= 100; progress += 10) {
          processingItem.progress = progress;
          emit('upload-progress', {file, progress});
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Convert to data URL
        const dataUrl = await fileToDataUrl(file);

        // Create preview for images
        const preview = file.type.startsWith('image/') ? dataUrl : null;

        // Create file record
        const fileRecord = {
          id: processingId,
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
          preview,
          uploadedAt: new Date()
        };

        // Add to recent files
        recentFiles.value.unshift(fileRecord);

        // Keep only max recent files
        if(recentFiles.value.length > props.maxRecentFiles * 2) {
          const maxFiles = props.maxRecentFiles * 2;
          recentFiles.value = recentFiles.value.slice(0, maxFiles);
        }

        // Emit success
        emit('file-uploaded', {
          file,
          dataUrl,
          preview,
          id: processingId
        });

      } catch(error) {
        console.error('File processing error:', error);
        emit('upload-error', {error, file});
        setError(`Failed to process ${file.name}: ${error.message}`);
      } finally {
        // Remove from processing
        processing.value =
          processing.value.filter(item => item.id !== processingId);
      }
    }

    function validateFile(file) {
      // Check file type
      if(!props.acceptedTypes.some(type => file.type.match(type))) {
        return {
          valid: false,
          error:
            'File type ' + file.type +
            ' not supported. Accepted types: ' +
            acceptedTypesDisplay.value
        };
      }

      // Check file size
      if(file.size > props.maxFileSize) {
        return {
          valid: false,
          error:
            'File size ' + formatFileSize(file.size) +
            ' exceeds maximum ' + formatFileSize(props.maxFileSize)
        };
      }

      return {valid: true};
    }

    function fileToDataUrl(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    }

    // Step 4: Event handlers
    function triggerFileSelect() {
      if(props.disabled || !fileInput.value) {
        return;
      }
      fileInput.value.click();
    }

    function onFileSelect(event) {
      const files = event.target.files;
      if(files && files.length > 0) {
        processFiles(files);
      }

      // Clear input for next selection
      if(fileInput.value) {
        fileInput.value.value = '';
      }
    }

    function onDragOver() {
      if(props.disabled) {
        return;
      }
      isDragOver.value = true;
    }

    function onDragLeave() {
      isDragOver.value = false;
    }

    function onDrop(event) {
      if(props.disabled) {
        return;
      }

      isDragOver.value = false;
      const files = event.dataTransfer.files;

      if(files && files.length > 0) {
        processFiles(files);
      }
    }

    function reScanFile(fileRecord) {
      emit('file-uploaded', {
        file: new File([''], fileRecord.name, {type: fileRecord.type}),
        dataUrl: fileRecord.dataUrl,
        preview: fileRecord.preview,
        id: fileRecord.id,
        isRescan: true
      });
    }

    function removeRecentFile(fileId) {
      recentFiles.value = recentFiles.value.filter(file => file.id !== fileId);
    }

    function setError(message) {
      uploadError.value = message;

      // Auto-clear error after 5 seconds
      setTimeout(() => {
        if(uploadError.value === message) {
          uploadError.value = null;
        }
      }, 5000);
    }

    function clearError() {
      uploadError.value = null;
    }

    // Step 5: Helper functions
    function formatFileSize(bytes) {
      if(bytes === 0) {
        return '0 Bytes';
      }

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Step 6: Return object
    return {
      // Refs
      fileInput,

      // State
      isDragOver,
      processing,
      recentFiles,
      uploadError,

      // Computed
      acceptedTypesString,
      acceptedTypesDisplay,

      // Event handlers
      triggerFileSelect,
      onFileSelect,
      onDragOver,
      onDragLeave,
      onDrop,
      reScanFile,
      removeRecentFile,
      clearError,

      // Helpers
      formatFileSize
    };
  }
};
</script>

<style scoped>
.upload-component-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.upload-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  border: 2px solid #007bff;
  border-radius: 6px;
  background: #007bff;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 600;
}

.upload-button:hover:not(:disabled) {
  background: #0056b3;
  border-color: #0056b3;
  transform: translateY(-1px);
}

.upload-button:disabled {
  background: #6c757d;
  border-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.upload-icon {
  font-size: 16px;
}

.drag-drop-area {
  border: 2px dashed #007bff;
  border-radius: 8px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #f8f9fa;
}

.drag-drop-area:hover:not(.disabled) {
  border-color: #0056b3;
  background: #e7f3ff;
}

.drag-drop-area.drag-over {
  border-color: #28a745;
  background: #e8f5e8;
  transform: scale(1.02);
}

.drag-drop-area.disabled {
  border-color: #6c757d;
  background: #e9ecef;
  cursor: not-allowed;
  opacity: 0.6;
}

.drag-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.drag-icon {
  font-size: 32px;
}

.drag-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drag-text strong {
  font-size: 16px;
  color: #333;
}

.drag-text small {
  font-size: 12px;
  color: #666;
}

.drag-formats {
  font-size: 12px;
  color: #666;
  margin-top: 8px;
}

.upload-progress {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
}

.upload-progress h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.progress-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.progress-bar {
  flex: 2;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #28a745;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #666;
  min-width: 40px;
  text-align: right;
}

.recent-files {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 16px;
}

.recent-files h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #333;
}

.recent-file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-info .file-name {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.file-size {
  font-size: 11px;
  color: #666;
}

.file-preview {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #dee2e6;
}

.file-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-actions {
  display: flex;
  gap: 4px;
}

.action-button {
  padding: 4px 8px;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  transition: all 0.2s ease;
}

.action-button.scan-again {
  background: #007bff;
  color: white;
}

.action-button.scan-again:hover {
  background: #0056b3;
}

.action-button.remove {
  background: #dc3545;
  color: white;
}

.action-button.remove:hover {
  background: #c82333;
}

.upload-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
}

.error-icon {
  font-size: 16px;
}

.error-message {
  flex: 1;
  font-size: 14px;
}

.error-dismiss {
  background: none;
  border: none;
  color: #721c24;
  cursor: pointer;
  font-size: 18px;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-dismiss:hover {
  background: rgba(114, 28, 36, 0.1);
  border-radius: 50%;
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .drag-drop-area {
    padding: 30px 15px;
  }

  .drag-icon {
    font-size: 24px;
  }

  .recent-file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .file-actions {
    align-self: stretch;
    justify-content: space-between;
  }
}
</style>
