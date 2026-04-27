import { modules } from "../framework/registry";
import { getAllToggles, setEnabled } from "../framework/storage";

async function render(): Promise<void> {
  const list = document.getElementById("modules");
  if (!list) return;

  const toggles = await getAllToggles();
  list.innerHTML = "";

  if (modules.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No modules registered.";
    list.appendChild(empty);
    return;
  }

  for (const mod of modules) {
    const enabled = toggles[mod.id] !== false;
    const row = document.createElement("li");
    row.className = "module-row";

    const checkboxId = `toggle-${mod.id}`;
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = checkboxId;
    checkbox.checked = enabled;
    checkbox.addEventListener("change", () => {
      void setEnabled(mod.id, checkbox.checked);
    });

    const label = document.createElement("label");
    label.htmlFor = checkboxId;

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = mod.name;
    label.appendChild(name);

    if (mod.description) {
      const desc = document.createElement("span");
      desc.className = "description";
      desc.textContent = mod.description;
      label.appendChild(desc);
    }

    row.appendChild(checkbox);
    row.appendChild(label);
    list.appendChild(row);
  }
}

render();
