/**
 * Copyright (c) 2018-present The Palmer Group
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs-extra';
import { diffImageToSnapshot } from 'jest-image-snapshot/src/diff-snapshot';

let snapshotOptions = {};
let snapshotResults = {};
let snapshotRunning = false;
const kebabSnap = '-snap.png';
const dotSnap = '.snap.png';
const dotDiff = '.diff.png';

export function matchImageSnapshotOptions(options = {}) {
  snapshotOptions = options;
  snapshotRunning = true;
  return null;
}

export function matchImageSnapshotResults() {
  snapshotRunning = false;
  return snapshotResults;
}

export function matchImageSnapshotPlugin({ path: screenshotPath }) {
  if (!snapshotRunning) {
    return null;
  }

  const {
    updateSnapshots,
    options: {
      failureThreshold = 0,
      failureThresholdType = 'pixel',
      ...options
    } = {},
  } = snapshotOptions;

  const receivedImageBuffer = fs.readFileSync(screenshotPath);
  const screenshotFileName = screenshotPath.slice(
    screenshotPath.lastIndexOf('/') + 1
  );
  const screenshotDir = screenshotPath.replace(screenshotFileName, '');
  const snapshotIdentifier = screenshotFileName.replace('.png', '');
  const snapshotsDir = screenshotDir.replace('screenshots', 'snapshots');

  const snapshotKebabPath = `${snapshotsDir}/${snapshotIdentifier}${kebabSnap}`;
  const snapshotDotPath = `${snapshotsDir}/${snapshotIdentifier}${dotSnap}`;

  const diffDir = `${snapshotsDir}/__diff_output__`;
  const diffDotPath = `${diffDir}/${snapshotIdentifier}${dotDiff}`;

  if (fs.pathExistsSync(snapshotDotPath)) {
    fs.copySync(snapshotDotPath, snapshotKebabPath);
  }

  snapshotResults = diffImageToSnapshot({
    snapshotsDir,
    receivedImageBuffer,
    snapshotIdentifier,
    failureThreshold,
    failureThresholdType,
    updateSnapshot: updateSnapshots,
    ...options,
  });

  const { pass, added, updated, diffOutputPath } = snapshotResults;

  if (!pass && !added && !updated) {
    fs.copySync(diffOutputPath, diffDotPath);
    fs.removeSync(diffOutputPath);
    fs.removeSync(snapshotKebabPath);

    return {
      path: diffOutputPath,
    };
  }

  fs.copySync(snapshotKebabPath, snapshotDotPath);
  fs.removeSync(snapshotKebabPath);

  return {
    path: snapshotDotPath,
  };
}

export function addMatchImageSnapshotPlugin(on) {
  on('task', {
    'Matching image snapshot': matchImageSnapshotOptions,
    'Recording snapshot results': matchImageSnapshotResults,
  });
  on('after:screenshot', matchImageSnapshotPlugin);
}
