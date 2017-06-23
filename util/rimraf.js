
const rimraf = require('rimraf');

module.exports = function(path) {
  return new Promise((resolve, reject) => {
    rimraf(path, { glob: false }, error => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
};