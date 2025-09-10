<template>
  <div id="app">
    <router-view />
  </div>
</template>

<script setup>
/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
// App wrapper component for test environment
</script>

<style>
/* Global test styles */
#app {
  min-height: 100vh;
  background: #ffffff;
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Prevent pinch to zoom on mobile devices */
body {
  touch-action: pan-y;
}
</style>