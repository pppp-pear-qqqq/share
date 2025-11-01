"use strict";
document.querySelectorAll("button:not([type])").forEach((e) => e.type = "button");
document.querySelectorAll('[role="button"]:not([tabIndex])').forEach((e) => e.tabIndex = 0);
document.addEventListener("keydown", (ev) => {
  if (!ev.defaultPrevented && (ev.key === " " || ev.key === "Enter") && document.activeElement?.role === "button") {
    ev.preventDefault();
    document.activeElement.click();
  }
});
document.querySelectorAll('a[href^="#"]').forEach((e) => e.addEventListener("click", function(ev) {
  ev.preventDefault();
  document.querySelector(this.getAttribute("href"))?.scrollIntoView({
    behavior: "smooth",
    block: "nearest"
  });
}));
document.querySelectorAll(".auto-sizing").forEach((e) => e.addEventListener("input", () => {
  e.style.height = "0";
  e.style.height = `${e.scrollHeight}px`;
}));
const help = document.getElementById("help");
document.querySelectorAll(".help").forEach((e) => {
  e.addEventListener("click", () => {
    const div = document.createElement("div");
    div.innerHTML = e.innerHTML;
    help.replaceChildren(div);
    help.showModal();
  });
});
document.querySelectorAll("dialog").forEach((e) => e.addEventListener("mousedown", (ev) => {
  if (ev.target === e) e.close();
}));
document.querySelectorAll("[data-theme]:not(:root)").forEach((e) => e.addEventListener("click", () => {
  document.documentElement.dataset.theme = e.dataset.theme;
  localStorage.setItem("colllus/theme", e.dataset.theme);
}));
let insert_tag_element;
document.querySelectorAll(".insert-tag").forEach((e) => e.addEventListener("focusin", () => insert_tag_element = e));
function insert_tag(pre, suf, elem) {
  if (elem ??= insert_tag_element) {
    const start = elem.selectionStart, end = elem.selectionEnd;
    if (start != null && end != null) {
      const prev = elem.value;
      elem.value = prev.slice(void 0, start) + pre + prev.slice(start, end) + suf + prev.slice(end);
      elem.selectionStart = start + pre.length;
      elem.selectionEnd = end + pre.length;
      elem.dispatchEvent(new Event("change"));
      elem.focus();
    }
  }
}
document.documentElement.dataset.willChange = localStorage.getItem("will-change") ?? "off";
