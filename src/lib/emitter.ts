import { EventEmitter } from 'node:events';

// Attach to globalThis to ensure exactly one instance exists 
// even if Vite bundles this file into multiple chunk endpoints.
const globalState = globalThis as unknown as { _chatAppEmitter: EventEmitter };

if (!globalState._chatAppEmitter) {
  globalState._chatAppEmitter = new EventEmitter();
  globalState._chatAppEmitter.setMaxListeners(100);
}

export const chatEmitter = globalState._chatAppEmitter;
