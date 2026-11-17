import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeMarkup } from '../views/home.js';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const member = homeMarkup({ variant: 'member', version: '1.2.3', changelogUrl: 'https://example.test/changelog' });
const visitor = homeMarkup({ variant: 'public', version: '1.2.3', changelogUrl: 'https://example.test/changelog' });

test('the home page opens on a gerbera meadow that is decorative only', () => {
  for (const markup of [member, visitor]) {
    assert.match(markup, /<h1 id="homeTitle-/);
    const meadow = markup.match(/<svg class="home-meadow"[^>]*>/)?.[0] || '';
    assert.match(meadow, /aria-hidden="true"/, 'the meadow is hidden from assistive technology');
    assert.ok((markup.match(/class="gerbera /g) || []).length >= 12, 'the meadow holds a field of gerberas, not a single flower');
  }
});

test('signed-in home has no tiles back into the app; the header and tab bar navigate', () => {
  assert.doesNotMatch(member, /data-screen=/);
  assert.doesNotMatch(member, /data-auth-mode=/);
  assert.match(member, /class="screen screen-menu screen-home[ "]/, 'it still renders as the menu screen');
});

test('visitors can sign in or create an account from the first viewport', () => {
  assert.match(visitor, /data-auth-mode="sign-in"[^>]*>[\s\S]*?Sign in/);
  assert.match(visitor, /data-auth-mode="sign-up"[^>]*>[\s\S]*?Create account/);
  assert.match(visitor, /<details class="language-picker"><\/details>/, 'visitors switch language with the same flag picker as the app');
  assert.doesNotMatch(visitor, /<select data-auth-language/, 'no plain text select without flags');
});

test('future content is announced honestly as coming soon, never as invented articles or links', () => {
  for (const markup of [member, visitor]) {
    const soon = markup.match(/<section class="home-soon"[\s\S]*?<\/section>/)?.[0] || '';
    for (const title of ['Who makes Cycle Tracker', 'Why it exists', 'Step-by-step guide', 'Courses']) {
      assert.match(soon, new RegExp(title), `${title} is announced`);
    }
    assert.equal((soon.match(/class="home-soon-tag"/g) || []).length, 4, 'each placeholder is tagged Soon');
    assert.doesNotMatch(soon, /<a\s/, 'placeholders link nowhere yet');
  }
});

test('the page says what the app does and stays educational', () => {
  for (const markup of [member, visitor]) {
    for (const title of ['Record a day in a few taps', 'See the whole cycle', 'Keep your data']) assert.match(markup, new RegExp(title));
    assert.match(markup, /educational tool[\s\S]*does not give medical advice/);
    assert.match(markup, /v1\.2\.3/);
    assert.doesNotMatch(markup, /contracept|safe days|fertile window|avoid pregnancy/i);
  }
});

test('signed-out visitors land on the welcome page; the sign-in form is one tap away', () => {
  const bootstrap = read('bootstrap.js');
  assert.match(bootstrap, /requested === "sign-in" \? "sign-in" : "welcome"/, 'no session and no requested form shows the welcome page');
  assert.match(bootstrap, /modeName === "welcome"/, 'show() renders the welcome page');
  assert.match(read('views/auth.js'), /data-auth-mode="welcome"/, 'the sign-in card leads back to the welcome page');
});

test('the meadow sways gently and holds still for reduced motion', () => {
  const css = read('styles/home.css');
  assert.match(css, /@keyframes home-sway/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  assert.match(read('styles/index.css'), /home\.css/);
});

test('signed-in home greets the user instead of repeating the visitor pitch', () => {
  assert.match(member, /<h1[^>]*>Welcome back\.<\/h1>/);
  assert.doesNotMatch(member, /Record your cycle, day by day\./);
});

test('coral stays on the one action: the calendar example selects in ink', () => {
  assert.doesNotMatch(read('styles/home.css'), /\.home-demo-day\.is-selected \{[^}]*var\(--action/);
});

test('the changelog arrow is drawn, not a text glyph', () => {
  assert.doesNotMatch(member, /↗/);
});

test('the meadow headlines use the self-hosted rounded Rubik face', () => {
  assert.match(read('styles/index.css'), /@fontsource-variable\/rubik/);
  assert.match(read('styles/home.css'), /--home-display: "Rubik Variable"/);
});

test('pages rendered after start-up mount the shared flag picker, including the sign-in card', () => {
  assert.match(read('i18n.js'), /export function mountLanguagePicker\(picker\)/);
  assert.match(read('views/welcome.js'), /mountLanguagePicker\(/);
  const auth = read('views/auth.js');
  assert.match(auth, /<details class="language-picker"><\/details>/);
  assert.match(auth, /mountLanguagePicker\(/);
  assert.doesNotMatch(auth, /<select data-auth-language/);
});
