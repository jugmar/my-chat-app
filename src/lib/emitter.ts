import { EventEmitter } from 'node:events';

// Create a singleton instance of EventEmitter for the application
const emitter = new EventEmitter();

// Increase MaxListeners to avoid memory leak warnings when many clients connect
emitter.setMaxListeners(100);

export const chatEmitter = emitter;
