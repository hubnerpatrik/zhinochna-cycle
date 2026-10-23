import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackPanelHtml } from '../ui/feedback-view.js';
import { setLanguage } from '../i18n.js';

const thread = {
  id: 'report', resolved: false,
  anchor: { label: '<script>label</script>', screen: '#/menu', version: '0.14.0', viewport: '390x844' },
  messages: [{ text: '<img src=x onerror=alert(1)>', at: '2026-10-23', author: 'Author' }],
};
const panel = overrides => feedbackPanelHtml({
  admin: false, busy: false, loading: false, error: '', draft: null,
  draftText: '', draftImage: '', thread: null, replyText: '', replyImage: '',
  imageLoading: false, shown: [thread], ...overrides,
});

test('feedback list and thread escape report content and keep resolution controls exclusive to admins', () => {
  setLanguage('en');
  for (const html of [panel(), panel({ thread })]) {
    assert.ok(html.includes('&lt;script&gt;label&lt;/script&gt;'));
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
    assert.doesNotMatch(html, /<script>|<img src=x|data-resolve=/);
  }
  assert.match(panel({ thread, admin: true }), /data-resolve=/);
});

test('feedback drafts preserve escaped text and block submission while an image is processing', () => {
  const html = panel({ draft: { anchor: thread.anchor }, draftText: '</textarea><script>draft</script>', imageLoading: true });
  assert.match(html, /&lt;\/textarea&gt;&lt;script&gt;draft&lt;\/script&gt;/);
  assert.match(html, /<button type="submit" disabled>/);
  assert.doesNotMatch(html, /data-reply|data-thread="/);
  assert.match(panel({ thread, busy: true }), /<textarea maxlength="4000" required disabled>/);
});
