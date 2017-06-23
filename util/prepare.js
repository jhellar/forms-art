
const fhc = require('fhc-promise');
const path = require('path');
const async = require('./async');

async function prepare(config) {
  let fh, form, theme, project;

  try {
    fh = await fhc.init(config);
  } catch (error) {
    throw new Error('fhc login: ' + error);
  }

  try {
    const formfile = path.resolve(__dirname, '../fixtures/form-simple.json');
    form = await fh.appforms.forms.create({ formfile });
  } catch (error) {
    throw new Error('creating form: ' + error);
  }

  try {
    await fh.appforms.environments.forms.deploy({ id: form._id, environment: config.environment });
  } catch (error) {
    throw new Error('deploying form: ' + error);
  }

  try {
    const themefile = path.resolve(__dirname, '../fixtures/theme.json');
    theme = await fh.appforms.themes.create({ themefile });
  } catch (error) {
    throw new Error('creating theme: ' + error);
  }

  try {
    await async.retry(async() => {
      project = await fh.projects.create({ projectName: 'art-test2', template: 'appforms_project' });
    }, 3);
  } catch (error) {
    throw new Error('creating project: ' + error);
  }

  const cloudApp = project.apps.find(app => app.type === 'cloud_nodejs');

  try {
    await async.retry(async() => {
      await fh.appforms.projects.create({ id: project.guid, theme: theme._id, forms: form._id });
    }, 3);
  } catch (error) {
    throw new Error('associating form with project: ' + error);
  }

  try {
    await async.retry(() =>
      fh.app.stage({
        app: cloudApp.guid,
        env: config.environment,
        runtime: 'node4',
        gitRef: {
          type: 'branch',
          value: 'master'
        }
      }), 3);
  } catch (error) {
    throw new Error('deploying cloud app: ' + error);
  }

  return { form, theme, project };
}

module.exports = prepare;