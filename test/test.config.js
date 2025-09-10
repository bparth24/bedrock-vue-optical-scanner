/*!
 * Copyright (c) 2025 Digital Bazaar, Inc. All rights reserved.
 */
import {config} from '@bedrock/core';
import {fileURLToPath} from 'url';
import path from 'path';
import '@bedrock/karma';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Karma test suites
config.karma.suites['bedrock-vue-optical-scanner'] =
  path.join('web', '**', '*.js');

// Webpack configuration for tests
config.karma.config.webpack.resolve = {
  modules: [
    path.resolve(__dirname, '..', 'node_modules'),
    path.resolve(__dirname, 'node_modules')
  ]
};

// Fallback for events (keeping your existing line)
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
config.karma.config.webpack.resolve.fallback = {
  events: require.resolve('events/')
};
