
const fhc = require('fhc-promise');

async function cleanup(config, form, theme, project) {
  let fh;

  try {
    fh = await fhc.init(config);
  } catch (error) {
    throw new Error('fhc login: ' + error);
  }

  try {
    if (project) {
      await fh.projects.delete(project.guid);
    }
  } catch (error) {}  // eslint-disable-line no-empty

  try {
    if (theme) {
      await fh.appforms.themes.delete({ id: theme._id });
    }
  } catch (error) {}  // eslint-disable-line no-empty

  try {
    if (form) {
      await fh.appforms.forms.delete({ id: form._id });
    }
  } catch (error) {}  // eslint-disable-line no-empty
}

module.exports = cleanup;