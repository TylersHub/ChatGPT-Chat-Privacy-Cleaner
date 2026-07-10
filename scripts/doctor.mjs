import process from 'node:process';
import { findChromeExecutable } from '../server/chatgpt.mjs';
import { loadConfig, ROOT } from '../server/config.mjs';

const config = await loadConfig();
const major = Number(process.versions.node.split('.')[0]);
if (major < 20) throw new Error(`Node.js 20 or newer is required. Current: ${process.version}`);

console.log(`Node: ${process.version}`);
console.log(`Project: ${ROOT}`);
console.log(`Chrome: ${await findChromeExecutable(config)}`);
console.log(`Dedicated profile: ${config.profileDir}`);
console.log(`Reports: ${config.outputDir}`);
console.log('ClearSlate is ready.');

