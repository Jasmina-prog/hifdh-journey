/** @type {import('next-i18next').UserConfig} */
module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'uz', 'ru'],
  },
  reloadOnPrerender: process.env.NODE_ENV === 'development',
};