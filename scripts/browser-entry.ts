/**
 * Entry for the browser bundle (lib/spendlens-core.js). It is a classic script that sets
 * window.SpendLensCore, because Chrome blocks ES modules on file:// pages.
 */
import * as core from '@spend-lens/core';
import * as banks from '@spend-lens/banks';

export const version = '0.1.0';
export { core, banks };
