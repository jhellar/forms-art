
const git = require('./git');
const rimraf = require('./rimraf');
const path = require('path');
const fhc = require('fhc-promise');

/**
 * Callback function to edit file in app repo.
 * @callback EditFuncCallback
 * @param {String} file - Absolute path to the file to edit.
 */

/**
 * Edit file in app repo.
 * This will clone the app repo, edit the file, push it back and pull the repo in studio.
 * @param {String} fileName - relative path to file to edit
 * @param {EditFuncCallback} editFunc
 */
async function editFile(config, appDetails, fileName, editFunc) {
  const tempFolder = path.resolve(__dirname, '../temp');
  const file = path.resolve(tempFolder, fileName);

  await rimraf(tempFolder);
  await git.clone(appDetails.internallyHostedRepoUrl, config.username, config.password, tempFolder, 'master');
  await editFunc(file);
  await git.add(fileName, tempFolder);
  await git.commit('updated', tempFolder);
  await git.push('origin', 'master', tempFolder);
  const fh = await fhc.init(config);
  await fh.git.pull(appDetails.guid);
}

module.exports = editFile;