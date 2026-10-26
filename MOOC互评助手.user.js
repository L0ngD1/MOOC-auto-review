// ==UserScript==
// @name         MOOC互评填表助手
// @namespace    local.mooc.review
// @version      1.1.0
// @description  自动选择各评分项最高分、取消答题者可见、点评填好；手动提交
// @match        https://www.icourse163.org/learn/*
// @run-at       document-idle
// @grant        none
// @noframes
// ==/UserScript==
(() => {
  'use strict';
  if (location.hostname !== 'www.icourse163.org' || !location.pathname.startsWith('/learn/')) return;
  const ID = 'local-mooc-review-helper';
  if (document.getElementById(ID)) return;
  let completed = new WeakSet(), enabled = true;
  const panel = document.createElement('div');
  panel.id = ID;
  panel.style.cssText = 'position:fixed;right:18px;top:120px;z-index:2147483647;background:white;color:#222;border:1px solid #0a8;border-radius:8px;padding:12px;box-shadow:0 3px 15px #0002;font:14px/1.6 sans-serif;max-width:280px';
  const title = document.createElement('strong');
  title.textContent = 'MOOC互评填表助手';
  const status = document.createElement('div');
  status.textContent = '等待互评页面';
  const pause = document.createElement('button');
  pause.type = 'button';
  pause.textContent = '暂停';
  pause.onclick = () => {
    enabled = !enabled;
    pause.textContent = enabled ? '暂停' : '继续';
    if (!enabled) status.textContent = '已暂停，可自行修改评分';
    else fill();
  };
  const again = document.createElement('button');
  again.type = 'button';
  again.textContent = '重新填写';
  again.style.marginLeft = '8px';
  again.onclick = () => {
    completed = new WeakSet(); enabled = true;
    pause.textContent = '暂停'; fill();
  };
  const note = document.createElement('div');
  note.textContent = '填写一次，可自行修改，核对后手动提交';
  note.style.cssText = 'font-size:12px;color:#666;margin-top:5px';
  panel.append(title, status, pause, again, note);
  document.body.append(panel);
  function available(el) {
    return !el.disabled && !el.readOnly && el.getClientRects().length > 0;
  }
  // 每个单选组分别比较数值，不依赖选项排列顺序。
  function highestRadios(area) {
    const groups = new Map();
    for (const radio of area.querySelectorAll('input.j-select[type="radio"]')) {
      const key = radio.name || radio.getAttribute('data-jid');
      if (!key) return []; // 无法确定分组时，等待页面完善，避免误选。
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(radio);
    }
    const result = [];
    for (const group of groups.values()) {
      const choices = group.filter(available);
      if (!choices.length) return [];
      if (choices.some(r => !r.value.trim() || !Number.isFinite(Number(r.value)))) return [];
      result.push(choices.reduce((best, r) => Number(r.value) > Number(best.value) ? r : best));
    }
    return result;
  }
  function fill() {
    if (!enabled || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    if (!/^#\/learn\/hw(?:\?|$)/.test(location.hash)) {
      status.textContent = '等待进入作业互评页'; return;
    }
    let questions = 0, scores = 0, done = 0;
    for (const area of document.querySelectorAll('.evaluateArea')) {
      const textarea = area.querySelector('textarea.j-textarea');
      const checkbox = area.querySelector('label.answerVisible input.j-acb[type="checkbox"]');
      const radios = highestRadios(area);
      if (!textarea || !checkbox || !radios.length || !available(textarea) || !available(checkbox) || !radios.every(available)) continue;
      questions++; scores += radios.length;
      if (!completed.has(textarea)) {
        for (const radio of radios) if (!radio.checked) radio.click();
        if (checkbox.checked) checkbox.click();
        const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
        setter.call(textarea, '好');
        for (const type of ['input', 'change', 'blur']) textarea.dispatchEvent(new Event(type, { bubbles: true }));
        if (radios.every(r => r.checked) && !checkbox.checked && textarea.value === '好') completed.add(textarea);
      }
      if (completed.has(textarea)) done++;
    }
    status.textContent = questions ? `已处理 ${done}/${questions} 题，共 ${scores} 个评分项` : '等待互评控件加载';
  }
  setInterval(fill, 1200);
  window.addEventListener('focus', fill);
  document.addEventListener('visibilitychange', fill);
  window.addEventListener('hashchange', fill);
  fill();
})();


