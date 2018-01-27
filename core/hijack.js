const hijack = {};

hijack.getCookie = (nightmare, email, password, fileID, waitMsec) => {
  return nightmare
    .goto('https://accounts.google.com/signin/v2')
    .wait('#identifierId')
    .type('#identifierId', email)
    .click('#identifierNext')
    .wait("input[type=password]")
    .wait(2000) // WORKAROUND
    .type("input[type=password]", password)
    .click('#passwordNext')
    .wait(3000)
    .goto(`https://drive.google.com/file/d/${fileID}/view`)
    .cookies.get('DRIVE_STREAM');
};

hijack.extractStreamMap = (nightmare, fileID, cookie) => {
  return nightmare
    .cookies.set(cookie)
    .goto(`https://drive.google.com/file/d/${fileID}/view`, {
      'Cookie': `${cookie.name}=${cookie.value}`,
    })
    .evaluate(() => {
      const html = document.body.innerHTML,
        s = html.indexOf('_initProjector'),
        e = html.indexOf('</script>', s),
        init = html.slice(s, e),
        streamMap = {};

      const _initProjector = (a, b, c) => {
        return c[19][0][17][1];
      }
      const fmtStreamMap = eval(init);
      fmtStreamMap.split(',').map((x) => {
        const spl = x.split('|');
        const iTag = parseInt(spl[0], 10);
        streamMap[iTag] = spl[1];
      });
      return streamMap;
    });
};

module.exports = hijack;