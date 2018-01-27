"use strict";

const bodyParser = require("body-parser");
const fs = require("fs");
const http = require("http");
const https = require("https");
const express = require("express");
const helmet = require("helmet");
const Sequelize = require("sequelize");
const Nightmare = require("nightmare");
const exphbs = require("express-handlebars");
const mnIndexOf = require("multiple-needles-indexof");
const request = require("request");
const url = require("url");
const config = require("./config/config");
const core = require("./core");

const app = express();
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

app.use("/asset", express.static("public"));

const securityToken = config.security.token;
const mainSite = config.security.mainsite;
const cache = {};
const cookieCache = {
  isLoading: false
};

// SSL certs
const options = {
  cert: fs.readFileSync("cert.pem"),
  key: fs.readFileSync("key.pem")
};

app.use(helmet());

app.use(helmet.referrerPolicy({
  policy: "no-referrer"
}));

app.use(helmet.frameguard({
  action: "allow-from",
  domain: mainSite
}));

app.engine("handlebars", exphbs({
  defaultLayout: "main"
}));
app.set("view engine", "handlebars");

// connect to mysql
const sequelize = new Sequelize(config.database.name, config.database.username, config.database.password, {
  host: config.database.host,
  dialect: "mysql",
  logging: false
});

const nightmare = Nightmare({
  switches: {
    "ignore-certificate-errors": true
  }
});

app.use(function(req, res, next) {
  next();
});

app.get("/v/:f/:token", function(req, res) {
  const fileId = req.params.f;
  const token = req.params.token;
  const haystack = req.get("Referrer");
  const sites = config.security.sites;

  if (token !== securityToken) {
    res.redirect(301, '/404');
  }

  if (haystack == undefined) {
    return res.redirect(301, "/404");
  }
  if (mnIndexOf(haystack, sites).index >= 0) {
    res.render("index", {
      fileId: fileId,
      token: token
    });
  } else {
    return res.redirect(301, "/404");
  }
});

app.get("/c/:f/:token", function(req, res) {
    // const fileId = req.params.f;
    const token = req.params.token;
    const urlstr = "https://i.imgur.com/PgexVCJ.jpg"; // Just a dot.

    if (token !== securityToken) {
      res.redirect(301, '/404');
    }

    const u = url.parse(urlstr);
    const headers = req.headers;

    const opts = {
      uri: u.href,
      method: "GET",
      headers: {
        "Content-Type": "image/jpg",
        "Range": headers.range
      }
    }
    request(opts).pipe(res);
  });

app.get("/video.mp4", function(req, res) {
  const urlStr = req.query.url;
  const u = url.parse(urlStr);
  const headers = req.headers;

  const cookie = cookieCache.data;

  const opts = {
    uri: u.href,
    method: "GET",
    headers: {
      "Cookie": `${cookie.name}=${cookie.value}`,
      "Range": headers.range
    }
  };

  request(opts).pipe(res);
});

app.get("/api", function(req, res) {
  const userIp = req.connection.remoteAddress;
  const fileId = req.query.f;

  let fromCache = false;

  if (!fileId) {
    res.send({});
    return;
  }

  const cookieLifetime = config.cache.cookieLifetime;
  const fileLifetime = config.cache.fileLifetime;
  const date = new Date();

  const onError = function(error) {
    res.send(error);
  };

  const sendData = function(cookie, streamMap) {
    res.send({
      cookie: cookie,
      streamMap: streamMap
    });
  };

  const onCookieLoaded = function(cookie) {
        // if cache data exists
        const dataFromCache = cache[fileId];
        if (dataFromCache && dataFromCache.date && (date - dataFromCache.date) / 1000 < fileLifetime) {
          sendData(cookie, dataFromCache.data);
          fromCache = true;
        } else {
            delete cache[fileId]; // clear cache if expired
          }

        // send request to database
        const query = "INSERT INTO stats (from_cache, ip, date) VALUES (:from_cache, :ip, :date)";
        sequelize.query(query, {
          replacements: {
            from_cache: fromCache,
            ip: userIp,
            date: new Date()
          }
        });

        if (fromCache) {
          return;
        }

        core.extractStreamMap({
          nightmare: nightmare,
          fileID: fileId,
          cookie: cookie,
          onSuccess: function(result) {
            cache[fileId] = cache[fileId] || {};
            cache[fileId].date = new Date();
            cache[fileId].data = result.streamMap;

            sendData(cookie, result.streamMap);
          },
          onError: function(error) {
            cache[fileId] = cache[fileId] || {};
            cache[fileId].date = null;
            cache[fileId].data = null;
            onError(error);
          }
        });
      };

    // load cookie not exists or if expired
    let isCookieExpired = (cookieCache.date && (date - cookieCache.date) / 1000 > cookieLifetime);
    if (!cookieCache.isLoading && (isCookieExpired || typeof isCookieExpired == "undefined")) {
      cookieCache.isLoading = true;
      core.getCookie({
        nightmare: nightmare,
        email: config.google.email,
        password: config.google.password,
        fileID: fileId,
        onSuccess: function(result) {
          cookieCache.isLoading = false;
          cookieCache.data = result.cookie;
          cookieCache.date = new Date();

          onCookieLoaded(result.cookie);
        },
        onError: function(error) {
          cookieCache.isLoading = false;
          cookieCache.data = null;
          cookieCache.date = null;
          onError(error);
        }
      })
        // if cookie is loading
      } else if (cookieCache && cookieCache.isLoading === true) {
        const interval = setInterval(() => {
          if (!cookieCache.isLoading && cookieCache.data) {
            clearInterval(interval);
            onCookieLoaded(cookieCache.data);
          }
        }, 200);
        // if cookie exist
      } else {
        // if cookie exist
        onCookieLoaded(cookieCache.data);
      }
    });

app.get("/404", function(req, res) {
  res.status(404);
  res.render('404-page', {
    layout: 'other'
  });
});

app.get("*", function(req, res) {
  res.redirect(301, '/404');
});

app.listen(80, () => {
  console.log('Example app listening on HTTP port 80!');
});

https.createServer(options, app).listen(443);