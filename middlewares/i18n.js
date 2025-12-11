const path = require("path");
const i18n = require("i18n");

i18n.configure({
  locales: ["en", "zh-CN", "zh-TW"],
  defaultLocale: "en",
  directory: path.join(__dirname, "../locales"),
  cookie: "locale",
  queryParameter: "lang",
});

function i18nMiddleware(req, res, next) {
  i18n.init(req, res);

  const userLang =
    (req.cookies && req.cookies.locale) ||
    req.acceptsLanguages(i18n.getLocales()) ||
    "en";
  i18n.setLocale(req, userLang);

  res.locals.__ = res.__;
  res.locals.locale = req.getLocale();

  next();
}

module.exports = { i18nMiddleware, i18n };
