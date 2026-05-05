import { modules } from "../framework/registry";
import { moduleGroups } from "../framework/groups";
import { getAllToggles, setEnabled } from "../framework/storage";

function createModuleRow(
  mod: (typeof modules)[number],
  toggles: Record<string, boolean>,
  grouped: boolean,
): HTMLLIElement {
  const enabled = toggles[mod.id] !== false;
  const row = document.createElement("li");
  row.className = grouped ? "module-row grouped" : "module-row";

  const label = document.createElement("label");
  label.htmlFor = `toggle-${mod.id}`;

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

  const toggle = document.createElement("div");
  toggle.className = "toggle";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.id = `toggle-${mod.id}`;
  checkbox.checked = enabled;
  checkbox.addEventListener("change", () => {
    void setEnabled(mod.id, checkbox.checked);
  });

  const track = document.createElement("label");
  track.className = "toggle-track";
  track.htmlFor = `toggle-${mod.id}`;

  const knob = document.createElement("span");
  knob.className = "toggle-knob";

  toggle.appendChild(checkbox);
  toggle.appendChild(track);
  toggle.appendChild(knob);

  row.appendChild(label);
  row.appendChild(toggle);
  return row;
}

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

  const ungrouped = modules.filter((m) => !m.group);
  const grouped = modules.filter((m) => m.group);

  // Render ungrouped modules first (same as before)
  for (const mod of ungrouped) {
    list.appendChild(createModuleRow(mod, toggles, false));
  }

  // Render grouped modules under section headers
  for (const group of moduleGroups) {
    const children = grouped.filter((m) => m.group === group.id);
    if (children.length === 0) continue;

    const header = document.createElement("li");
    header.className = "group-header";

    const headerName = document.createElement("span");
    headerName.className = "group-name";
    headerName.textContent = group.name;
    header.appendChild(headerName);

    const headerDesc = document.createElement("span");
    headerDesc.className = "group-description";
    headerDesc.textContent = group.description;
    header.appendChild(headerDesc);

    list.appendChild(header);

    for (const mod of children) {
      list.appendChild(createModuleRow(mod, toggles, true));
    }
  }
}

render();
