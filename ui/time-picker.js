import { setText, setTranslatedAttribute } from '../i18n.js';

const TIME_INPUT_LENGTH = 5;
const TIME_PART_DIGITS = 2;
const MINUTE_STEP = 5;
const MAX_PICKER_MINUTE = 55;
const OPTION_ROW_HEIGHT = 40;
const SCROLL_SETTLE_DELAY_MS = 160;
const PANEL_VIEWPORT_GAP = 8;
const TIME_COLUMNS = [[0, 24, 1, 'Hours'], [1, 60, MINUTE_STEP, 'Minutes']];
const DEFAULT_TIME_PARTS = ['08', '00'];

function readTimeParts(value) {
  const parts = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(':') : [...DEFAULT_TIME_PARTS];
  parts[1] = String(Math.min(MAX_PICKER_MINUTE, Math.round(Number(parts[1]) / MINUTE_STEP) * MINUTE_STEP))
    .padStart(TIME_PART_DIGITS, '0');
  return parts;
}

function dispatchTimeChange(input) {
  ['input', 'change'].forEach(type => input.dispatchEvent(new Event(type, { bubbles: true })));
}

let activePicker = null;
let nextId = 0;

// Keep the HH:MM input contract used by profile and observation persistence.
export function enhanceTimeInputs(root) {
  root.querySelectorAll?.('input[type="time"]').forEach(input => {
    const wrapper = document.createElement("div");
    wrapper.className = "time-picker";
    input.before(wrapper);
    wrapper.append(input);
    input.type = "text";
    input.inputMode = "numeric";
    input.placeholder = "HH:MM";
    input.pattern = "([01][0-9]|2[0-3]):[0-5][0-9]";
    input.maxLength = TIME_INPUT_LENGTH;
    setTranslatedAttribute(input, "aria-label", "Measurement time (HH:MM)");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "time-picker-toggle";
    setTranslatedAttribute(toggle, "aria-label", "Choose time");
    toggle.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>';
    const panel = document.createElement("div");
    panel.id = `time-picker-${++nextId}`;
    panel.className = "time-picker-panel";
    panel.hidden = true;
    panel.setAttribute("role", "group");
    setTranslatedAttribute(panel, "aria-label", "Choose measurement time");
    toggle.setAttribute("aria-controls", panel.id);
    toggle.setAttribute("aria-expanded", "false");
    panel.innerHTML = '<div class="time-picker-heading" data-i18n>Measurement time</div><div class="time-picker-columns"></div><div class="time-picker-footer"><button type="button" class="time-picker-clear" data-i18n>Clear</button><button type="button" class="time-picker-done" data-i18n>Done</button></div>';
    wrapper.append(toggle, panel);
    const columns = panel.querySelector(".time-picker-columns");
    const choices = [];
    const wheels = [];
    const readParts = () => readTimeParts(input.value);
    TIME_COLUMNS.forEach(([part, count, step, label]) => {
      const column = document.createElement("div");
      column.className = "time-picker-column";
      const heading = document.createElement("div");
      heading.className = "time-picker-label";
      setText(heading, label);
      const list = document.createElement("div");
      list.className = "time-picker-options";
      list.setAttribute("role", "listbox");
      setTranslatedAttribute(list, "aria-label", label);
      list.tabIndex = 0;
      let timer;
      let interacting = false;
      const select = index => {
        const parts = readParts();
        parts[part] = String(index * step).padStart(TIME_PART_DIGITS, "0");
        input.value = parts.join(":");
        dispatchTimeChange(input);
        sync();
      };
      const settle = () => {
        clearTimeout(timer);
        if (!interacting || panel.hidden) return;
        interacting = false;
        const index = Math.max(0, Math.min(count / step - 1, Math.round(list.scrollTop / OPTION_ROW_HEIGHT)));
        select(index);
        list.scrollTo({ top: index * OPTION_ROW_HEIGHT, behavior: "smooth" });
      };
      list.addEventListener("wheel", () => { interacting = true; }, { passive: true });
      list.addEventListener("pointerdown", () => { interacting = true; });
      list.addEventListener("scroll", () => {
        clearTimeout(timer);
        if (interacting) timer = setTimeout(settle, SCROLL_SETTLE_DELAY_MS);
      });
      list.addEventListener("keydown", event => {
        if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const current = Number(readParts()[part]) / step;
        const index = event.key === "Home" ? 0 : event.key === "End" ? count / step - 1
          : Math.max(0, Math.min(count / step - 1, current + (event.key === "ArrowDown" ? 1 : -1)));
        interacting = false;
        select(index);
        list.scrollTo({ top: index * OPTION_ROW_HEIGHT, behavior: "smooth" });
      });
      wheels.push({ list, part, step, reset: () => { clearTimeout(timer); interacting = false; }, settle });
      Array.from({ length: count / step }, (_, index) => index * step).forEach(value => {
        const button = document.createElement("button");
        const padded = String(value).padStart(TIME_PART_DIGITS, "0");
        button.type = "button";
        button.tabIndex = -1;
        button.id = `${panel.id}-${part}-${value}`;
        button.setAttribute("role", "option");
        button.textContent = padded;
        setTranslatedAttribute(button, "aria-label", `${label}: ${padded}`);
        button.onclick = () => {
          interacting = false;
          clearTimeout(timer);
          select(value / step);
          list.scrollTo({ top: value / step * OPTION_ROW_HEIGHT, behavior: "smooth" });
        };
        choices.push({ button, part, padded });
        list.append(button);
      });
      const drum = document.createElement("div");
      drum.className = "time-picker-drum";
      drum.append(list);
      column.append(heading, drum);
      columns.append(column);
    });
    function sync() {
      const parts = readParts();
      choices.forEach(({ button, part, padded }) => {
        button.setAttribute("aria-selected", String(parts[part] === padded));
        if (parts[part] === padded) button.parentElement.setAttribute("aria-activedescendant", button.id);
      });
    }
    function close() {
      wheels.forEach(wheel => wheel.reset());
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (activePicker === close) activePicker = null;
    }
    toggle.onclick = () => {
      if (!panel.hidden) return close();
      activePicker?.();
      activePicker = close;
      sync();
      panel.hidden = false;
      panel.classList.remove("is-above");
      const fieldRect = input.getBoundingClientRect();
      const panelHeight = panel.getBoundingClientRect().height;
      if (fieldRect.bottom + panelHeight + PANEL_VIEWPORT_GAP > window.innerHeight && fieldRect.top > panelHeight + PANEL_VIEWPORT_GAP) {
        panel.classList.add("is-above");
      }
      toggle.setAttribute("aria-expanded", "true");
      const parts = readParts();
      wheels.forEach(({ list, part, step, reset }) => {
        reset();
        list.scrollTop = Number(parts[part]) / step * OPTION_ROW_HEIGHT;
      });
    };
    wrapper.addEventListener("focusout", event => {
      if (!wrapper.contains(event.relatedTarget)) close();
    });
    wrapper.addEventListener("keydown", event => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        close();
        toggle.focus();
      }
    });
    panel.querySelector(".time-picker-done").onclick = () => {
      wheels.forEach(wheel => wheel.settle());
      close();
      toggle.focus();
    };
    panel.querySelector(".time-picker-clear").onclick = () => {
      input.value = "";
      dispatchTimeChange(input);
      close();
      input.focus();
    };
  });
}
