const vo = require('vo');
const Nightmare = require('nightmare');
const hijack = require('./hijack');

module.exports.load = (argv) => {
  vo(function* () {

    const waitMsec = parseInt(argv.wait, 10);
    const cookie = yield hijack.getCookie(argv.nightmare, argv.email, argv.password, argv.fileID, waitMsec);
    if (!cookie) {
      throw new Error('failed to get cookie');
    }
    const streamMap = yield hijack.extractStreamMap(argv.nightmare, argv.fileID, cookie);
    yield nightmare.end();
    return {
      'cookie': cookie,
      'stream_map': streamMap,
    };
  })((err, result) => {
    if (err) {
      argv.onError(err);
    } else {
      argv.onSuccess(result);
    }
  });
};

module.exports.getCookie = (argv) => {
  vo(function* () {
    const waitMsec = parseInt(argv.wait, 10);
    const cookie = yield hijack.getCookie(argv.nightmare, argv.email, argv.password, argv.fileID, waitMsec);
    if (!cookie) {
      throw new Error('failed to get cookie');
    }

    return {'cookie': cookie};
  })((err, result) => {
    if (err) {
      argv.onError(err);
    } else {
      argv.onSuccess(result);
    }
  });
};

module.exports.extractStreamMap = (argv) => {
  vo(function* () {
    const streamMap = yield hijack.extractStreamMap(argv.nightmare, argv.fileID, argv.cookie);

    return {'streamMap': streamMap};
  })((err, result) => {

    if (err) {
      argv.onError(err);
    } else {
      argv.onSuccess(result);
    }
  });
};
