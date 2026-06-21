module.exports = {
  locales: ['fr'],
  output: 'public/locales/$LOCALE.json',
  input: ['src/**/*.{js,jsx,ts,tsx}'],
  createOldCatalogs: false,
  keepRemoved: true,
  lexers: {
    js: ['JsxLexer'],
    ts: ['JsxLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],
    default: ['JsxLexer']
  }
};
