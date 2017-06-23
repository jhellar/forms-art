
const fhc = require('fhc-promise');
const request = require('request-promise-native');
const config = require('../config/common');
const prepare = require('../util/prepare');
const cleanup = require('../util/cleanup');
const editFile = require('../util/edit-file');
const fsp = require('fs-extra');
const path = require('path');
const async = require('../util/async');
require('chai').should();
const formFixture = require('../fixtures/form-simple');
const themeFixture = require('../fixtures/theme');
const submissionFixture = require('../fixtures/submission-simple');

describe('AppForms Cloud API test', function() {

  this.timeout(5 * 60 * 1000);

  let form, theme, project, cloudUrl, formDefinition;

  before(async function() {
    ({ form, theme, project } = await prepare(config));

    const cloudApp = project.apps.find(app => app.type === 'cloud_nodejs');

    await editCloudApp(cloudApp);
    await deployCloudApp(cloudApp);
    cloudUrl = await getCloudAppUrl(cloudApp);
  });

  it('should get list of forms', async function() {
    const options = {
      uri: `${cloudUrl}/hello/getForms/`,
      method: 'POST',
      json: {}
    };
    const response = await request(options);
    response.should.be.an('object');
    response.forms.should.be.an('Array');
    response.forms.length.should.equal(1);
    response.forms[0].should.be.an('object');
    response.forms[0].name.should.equal(formFixture.name);
    response.forms[0].createdBy.should.equal(config.username);
    response.forms[0]._id.should.equal(form._id);
  });

  it('should get a form', async function() {
    const options = {
      uri: `${cloudUrl}/hello/getForm/`,
      method: 'POST',
      json: { _id: form._id }
    };
    const response = await request(options);
    response.pages.length.should.equal(formFixture.pages.length);
    response.pages[0].fields.length.should.equal(formFixture.pages[0].fields.length);
    formDefinition = response;
  });

  it('should get populated form list', async function() {
    const options = {
      uri: `${cloudUrl}/hello/getPopulatedFormList/`,
      method: 'POST',
      json: { formids: [form._id] }
    };
    const response = await request(options);
    response.should.be.an('Array');
    response.length.should.equal(1);
    response[0].should.eql(formDefinition);
  });

  it('should get theme', async function() {
    const options = {
      uri: `${cloudUrl}/hello/getTheme/`,
      method: 'POST',
      json: {}
    };
    const response = await request(options);
    response.should.be.an('object');
    response.name.should.equal(themeFixture.name);
    response.createdBy.should.equal(config.username);
    response._id.should.equal(theme._id);
  });

  it('should get app client config', async function() {
    const options = {
      uri: `${cloudUrl}/hello/getAppClientConfig/`,
      method: 'POST',
      json: {}
    };
    const response = await request(options);
    response.should.be.an('object');
  });

  it('should get no submissions', async function() {
    const options = {
      uri: `${cloudUrl}/hello/getSubmissions/`,
      method: 'POST',
      json: { formId: [form._id] }
    };
    const response = await request(options);
    response.should.be.an('object');
    response.submissions.should.be.an('Array');
    response.submissions.length.should.equal(0);
  });

  it('should pass submission test', async function() {
    const formFields = [];
    for (const fieldName in submissionFixture) {  // eslint-disable-line guard-for-in
      const fieldEntry = {
        fieldId: form.pages[0].fields.find(field => field.name === fieldName)._id,
        fieldValues: [submissionFixture[fieldName]]
      };
      formFields.push(fieldEntry);
    }
    const submission = {
      formId: form._id,
      formFields,
      deviceIPAddress: '192.168.1.1',
      comments: [],
      deviceFormTimestamp: 1498200262394
    };
    console.log(JSON.stringify(submission, null, 2));
    const options = {
      uri: `${cloudUrl}/hello/submitFormData/`,
      method: 'POST',
      json: { submission, appClientId: '1' }
    };
    const response = await request(options);
    console.log(JSON.stringify(response, null, 2));
  });

  after(async function() {
    await cleanup(config, form, theme, project);
  });

});

async function editCloudApp(cloudApp) {
  try {
    await editFile(config, cloudApp, 'lib/hello.js', async file => {
      const fixtureFile = path.resolve(__dirname, '../fixtures/cloud.js');
      await fsp.copy(fixtureFile, file);
    });
  } catch (error) {
    throw new Error('editing cloud app: ' + error);
  }
}

async function deployCloudApp(cloudApp) {
  const fh = await fhc.init(config);

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
}

async function getCloudAppUrl(cloudApp) {
  const fh = await fhc.init(config);
  let cloudUrl;

  try {
    cloudUrl = (await fh.app.hosts({
      env: config.environment,
      app: cloudApp.guid
    })).url;
  } catch (error) {
    throw new Error('getting cloud app url: ' + error);
  }

  return cloudUrl;
}