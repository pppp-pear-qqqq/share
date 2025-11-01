"use strict";
customElements.define("check-img", class extends HTMLElement {
  static formAssociated = true;
  // フォーム連携
  static observedAttributes = ["off-src", "off-alt", "on-src", "on-alt", "size"];
  internals;
  checked;
  off;
  on;
  constructor() {
    super();
    this.internals = this.attachInternals();
    this.checked = false;
    this.off = document.createElement("img");
    this.on = document.createElement("img");
  }
  connectedCallback() {
    this.role = "checkbox";
    this.tabIndex = Number(this.getAttribute("tabIndex"));
    this.updateFormValue();
    this.addEventListener("click", this.toggle.bind(this));
    this.addEventListener("keydown", (ev) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        this.toggle();
      }
    });
    const shadow = this.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = "img{vertical-align:bottom}:host([checked]) .off{display:none}:host(:not([checked])) .on{display:none}";
    this.off.className = "off";
    this.off.alt = "\u7121\u52B9";
    this.on.className = "on";
    this.on.alt = "\u6709\u52B9";
    shadow.appendChild(style);
    shadow.appendChild(this.off);
    shadow.appendChild(this.on);
  }
  attributeChangedCallback(name, _old_value, new_value) {
    switch (name) {
      case "off-src":
        this.off.src = new_value;
        break;
      case "off-alt":
        this.off.alt = new_value;
        break;
      case "on-src":
        this.on.src = new_value;
        break;
      case "on-alt":
        this.on.alt = new_value;
        break;
      case "size":
        {
          const size = Number(new_value);
          this.off.width = size;
          this.off.height = size;
          this.on.width = size;
          this.on.height = size;
        }
        break;
    }
  }
  toggle() {
    this.checked = !this.checked;
    this.setAttribute("aria-checked", String(this.checked));
    this.toggleAttribute("checked", this.checked);
    this.updateFormValue();
  }
  updateFormValue() {
    if (this.getAttribute("name")) this.internals.setFormValue(this.checked ? "on" : "");
  }
  // public API
  get form() {
    return this.internals.form;
  }
  get name() {
    return this.getAttribute("name") ?? "";
  }
  get type() {
    return "checkbox";
  }
  get checkedValue() {
    return this.checked;
  }
});
customElements.define("hamburger-menu", class extends HTMLElement {
  constructor() {
    super();
  }
  connectedCallback() {
    this.role = "button";
    this.tabIndex = Number(this.getAttribute("tabIndex"));
    this.addEventListener("click", this.toggle.bind(this));
    this.addEventListener("keydown", (ev) => {
      if (ev.key === " " || ev.key === "Enter") {
        ev.preventDefault();
        this.toggle();
      }
    });
    const shadow = this.attachShadow({ mode: "closed" });
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = "style/hamburger.css";
    shadow.appendChild(style);
    shadow.appendChild(document.createElement("div"));
    shadow.appendChild(document.createElement("div"));
    shadow.appendChild(document.createElement("div"));
  }
  toggle() {
    this.toggleAttribute("open", this.getAttribute("open") === null);
  }
});
