const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const blockDefinitions = {
  motion: [
    ["Mover 10 pasos", "Cambia la posición del objeto", "motion"],
    ["Ir a X: 0 Y: 0", "Establece una posición", "motion"],
    ["Cambiar dirección 15°", "Rota el objeto", "motion"],
    ["Deslizar en 1 segundo", "Movimiento interpolado", "motion"],
    ["Cambiar X por 10", "Desplaza el objeto horizontalmente", "motion"],
    ["Cambiar Y por 10", "Desplaza el objeto verticalmente", "motion"],
    ["Fijar X a 0", "Establece la coordenada horizontal", "motion"],
    ["Fijar Y a 0", "Establece la coordenada vertical", "motion"],
    ["Apuntar en dirección 90°", "Establece la orientación del objeto", "motion"]
  ],
  looks: [
    ["Cambiar tamaño 10%", "Modifica la escala", "looks"],
    ["Fijar tamaño a 100%", "Establece el tamaño en porcentaje", "looks"],
    ["Mostrar", "Hace visible el objeto", "looks"],
    ["Ocultar", "Oculta el objeto", "looks"],
    ["Cambiar efecto de color", "Aplica un efecto visual", "looks"]
  ],
  events: [
    ["Al pulsar bandera verde", "Evento de inicio", "events"],
    ["Al pulsar tecla espacio", "Evento de teclado", "events"],
    ["Al recibir mensaje", "Comunicación entre objetos", "events"]
  ],
  control: [
    ["Esperar 1 segundo", "Pausa la secuencia", "control"],
    ["Repetir 10 veces", "Bucle de repetición", "control"],
    ["Por siempre", "Bucle continuo", "control"],
    ["Si ... entonces", "Ejecución condicional", "control"]
  ],
  sensing: [
    ["¿Tecla presionada?", "Consulta el teclado", "sensing"],
    ["¿Tocando objeto?", "Detección de contacto", "sensing"],
    ["Distancia a objeto", "Calcula distancia", "sensing"]
  ],
  variables: [
    ["Fijar puntos a 0", "Asigna un valor", "variables"],
    ["Cambiar puntos por 1", "Incrementa una variable", "variables"],
    ["Añadir elemento a lista", "Manipula una lista", "variables"]
  ],
  game: [
    ["Aplicar gravedad", "Componente de física 2D", "game"],
    ["Mover con velocidad", "Movimiento basado en velocidad", "game"],
    ["Comprobar colisión", "Consulta el collider", "game"],
    ["Cambiar escena", "Carga otra escena", "game"],
    ["Activar cámara", "Control de cámara 2D", "game"]
  ]
};

const state = {
  mode: "blocks",
  category: "motion",
  blocks: [],
  objects: [
    {id: "player", name: "Player", x: 160, y: 470, scale: 1, rotation: 0, color: "#6c8cff", visible: true, gravity: false, collision: true, type: "Sprite"},
    {id: "platform", name: "Platform", x: 640, y: 630, scale: 1, rotation: 0, color: "#4dd6a0", visible: true, gravity: false, collision: true, type: "Platform", width: 1280, height: 40}
  ],
  selectedId: "player",
  running: false,
  showGrid: true,
  zoom: 100,
  gravityVelocity: 0,
  lastFrame: 0,
  keys: new Set()
};

const canvas = $("#gameCanvas");
const ctx = canvas.getContext("2d");
const selectedObject = () => state.objects.find(o => o.id === state.selectedId);
const log = (message, type = "") => {
  const line = document.createElement("div");
  line.className = "console-line " + type;
  line.textContent = "› " + message;
  $("#consoleContent").prepend(line);
};
const updateSaveStatus = (message) => $("#saveStatus").textContent = message;

function renderBlockLibrary(filter = "") {
  const blocks = blockDefinitions[state.category].filter(b => b[0].toLowerCase().includes(filter.toLowerCase()));
  $("#blockLibrary").innerHTML = "";
  $("#blockCount").textContent = blocks.length;
  blocks.forEach(([name, description, category]) => {
    const button = document.createElement("button");
    button.className = "block-card " + category;
    button.innerHTML = "";
    const title = document.createElement("span");
    title.textContent = name;
    const small = document.createElement("small");
    small.textContent = description;
    button.append(title, small);
    button.draggable = true;
    button.addEventListener("dragstart", event => {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-scratch-evolution-block", JSON.stringify({name, description, category}));
    });
    button.addEventListener("click", () => addBlock(name, description, category));
    $("#blockLibrary").append(button);
  });
}
function isContainerBlock(block) {
  const name = block.name.toLowerCase();
  return name.includes("repetir") || name.includes("por siempre") || name.includes("si ... entonces");
}
function normalizeBlockTree(input) {
  const blocks = Array.isArray(input) ? input.map(block => ({
    ...block,
    id: block.id || crypto.randomUUID(),
    children: Array.isArray(block.children) ? normalizeBlockTree(block.children) : undefined
  })) : [];
  // Compatibilidad: los proyectos antiguos guardaban el cuerpo de los bucles en la pila plana.
  if (blocks.some(block => Array.isArray(block.children))) return blocks.map(block => {
    if (isContainerBlock(block) && !Array.isArray(block.children)) block.children = [];
    return block;
  });
  const firstLoop = blocks.findIndex(block => /repetir|por siempre/i.test(block.name || ""));
  if (firstLoop >= 0) {
    const loop = blocks[firstLoop];
    loop.children = blocks.slice(firstLoop + 1);
    return blocks.slice(0, firstLoop + 1).map(block => {
      if (isContainerBlock(block) && !Array.isArray(block.children)) block.children = [];
      return block;
    });
  }
  return blocks.map(block => {
    if (isContainerBlock(block)) block.children = [];
    return block;
  });
}
function addBlock(name, description, category, targetList = state.blocks) {
  const block = {id: crypto.randomUUID(), name, description, category};
  if (isContainerBlock(block)) block.children = [];
  targetList.push(block);
  renderScript();
  $("#emptyBlocks").classList.add("hidden");
  log("Bloque añadido: " + name, "success");
  updateSaveStatus("Cambios sin guardar");
}
function renderScript() {
  const stack = $("#scriptStack");
  stack.innerHTML = "";
  const renderList = (list, parent, nested = false) => {
    list.forEach((block, index) => {
      const el = document.createElement("div");
      el.className = "script-block " + block.category + (nested ? " nested-block" : "");
      el.draggable = !nested;
      el.dataset.blockId = block.id;
      if (!nested) {
        el.addEventListener("dragstart", event => {
          state.draggingBlockId = block.id;
          event.dataTransfer.effectAllowed = "move";
          event.dataTransfer.setData("text/plain", block.id);
          el.classList.add("dragging");
        });
        el.addEventListener("dragend", () => {
          state.draggingBlockId = null;
          $(".script-block").forEach(node => node.classList.remove("dragging", "drop-target"));
        });
        el.addEventListener("dragover", event => {
          if (!event.dataTransfer.types.includes("application/x-scratch-evolution-block")) {
            event.preventDefault();
            if (state.draggingBlockId && state.draggingBlockId !== block.id) el.classList.add("drop-target");
          }
        });
        el.addEventListener("dragleave", () => el.classList.remove("drop-target"));
        el.addEventListener("drop", event => {
          if (event.dataTransfer.getData("application/x-scratch-evolution-block")) return;
          event.preventDefault();
          el.classList.remove("drop-target");
          const fromId = state.draggingBlockId || event.dataTransfer.getData("text/plain");
          const from = state.blocks.findIndex(item => item.id === fromId);
          const to = state.blocks.findIndex(item => item.id === block.id);
          if (from < 0 || to < 0 || from === to) return;
          const [moved] = state.blocks.splice(from, 1);
          state.blocks.splice(to, 0, moved);
          renderScript();
          updateSaveStatus("Cambios sin guardar");
        });
      }

      const controls = document.createElement("div");
      controls.className = "script-controls";
      if (!nested) {
        const up = document.createElement("button");
        up.type = "button"; up.textContent = "↑"; up.title = "Mover bloque arriba";
        up.disabled = index === 0;
        up.addEventListener("click", () => moveBlock(index, -1));
        const down = document.createElement("button");
        down.type = "button"; down.textContent = "↓"; down.title = "Mover bloque abajo";
        down.disabled = index === list.length - 1;
        down.addEventListener("click", () => moveBlock(index, 1));
        controls.append(up, down);
      }
      const remove = document.createElement("button");
      remove.type = "button"; remove.className = "script-remove";
      remove.textContent = "×"; remove.title = "Eliminar bloque";
      remove.addEventListener("click", () => {
        const removeFrom = (items) => {
          const at = items.findIndex(item => item.id === block.id);
          if (at >= 0) { items.splice(at, 1); return true; }
          return items.some(item => removeFrom(item.children || []));
        };
        removeFrom(state.blocks);
        renderScript();
        updateSaveStatus("Cambios sin guardar");
      });
      controls.append(remove);

      const label = document.createElement("span");
      label.className = "script-label";
      label.textContent = block.name;
      el.append(controls, label);

      const values = [...block.name.matchAll(/-?\d+(?:\.\d+)?/g)];
      if (values.length) {
        const params = document.createElement("div");
        params.className = "script-parameters";
        values.forEach((match, parameterIndex) => {
          const input = document.createElement("input");
          input.type = "number"; input.step = "any"; input.value = match[0];
          input.setAttribute("aria-label", "Parámetro " + (parameterIndex + 1) + " de " + block.name);
          input.addEventListener("change", () => {
            const current = [...block.name.matchAll(/-?\d+(?:\.\d+)?/g)];
            const target = current[parameterIndex];
            if (!target) return;
            const next = Number(input.value);
            if (!Number.isFinite(next)) return;
            block.name = block.name.slice(0, target.index) + String(next) + block.name.slice(target.index + target[0].length);
            renderScript(); updateSaveStatus("Cambios sin guardar");
          });
          params.append(input);
        });
        el.append(params);
      }

      if (isContainerBlock(block)) {
        if (!Array.isArray(block.children)) block.children = [];
        const body = document.createElement("div");
        body.className = "block-children";
        body.addEventListener("dragover", event => {
          if (event.dataTransfer.types.includes("application/x-scratch-evolution-block")) event.preventDefault();
        });
        body.addEventListener("drop", event => {
          const payload = event.dataTransfer.getData("application/x-scratch-evolution-block");
          if (!payload) return;
          event.preventDefault(); event.stopPropagation();
          try {
            const data = JSON.parse(payload);
            if (data && typeof data.name === "string" && typeof data.category === "string") {
              addBlock(data.name, data.description || "", data.category, block.children);
              log("Bloque anidado en " + block.name + ".", "success");
            }
          } catch { log("No se pudo añadir el bloque anidado.", "warn"); }
        });
        const hint = document.createElement("small");
        hint.className = "nested-hint";
        hint.textContent = block.children.length ? "Cuerpo del bloque" : "Arrastra aquí bloques desde la biblioteca";
        body.append(hint);
        renderList(block.children, body, true);
        el.append(body);
      }
      const detail = document.createElement("small");
      detail.textContent = block.description + (nested ? "" : " · Arrastra para reordenar");
      el.append(detail);
      parent.append(el);
    });
  };
  renderList(state.blocks, stack, false);
  $("#emptyBlocks").classList.toggle("hidden", state.blocks.length > 0);
}
function moveBlock(index, offset) {
  const target = index + offset;
  if (target < 0 || target >= state.blocks.length) return;
  [state.blocks[index], state.blocks[target]] = [state.blocks[target], state.blocks[index]];
  renderScript();
  updateSaveStatus("Cambios sin guardar");
}
$("#scriptStack").addEventListener("dragover", event => {
  if (event.dataTransfer.types.includes("application/x-scratch-evolution-block")) event.preventDefault();
});
$("#scriptStack").addEventListener("drop", event => {
  const payload = event.dataTransfer.getData("application/x-scratch-evolution-block");
  if (!payload) return;
  event.preventDefault();
  try {
    const block = JSON.parse(payload);
    if (block && typeof block.name === "string" && typeof block.category === "string") {
      addBlock(block.name, block.description || "", block.category);
      log("Bloque añadido mediante arrastrar y soltar.", "success");
    }
  } catch {
    log("No se pudo añadir ese bloque.", "warn");
  }
});
function renderObjects() {
  const list = $("#objectList");
  list.innerHTML = "";
  state.objects.forEach(obj => {
    const row = document.createElement("div");
    row.className = "object-row" + (obj.id === state.selectedId ? " selected" : "");
    const color = document.createElement("i");
    color.className = "object-color";
    color.style.background = obj.color;
    const name = document.createElement("span");
    name.textContent = obj.name;
    const type = document.createElement("small");
    type.textContent = obj.type;
    row.append(color, name, type);
    row.addEventListener("click", () => selectObject(obj.id));
    list.append(row);
  });
}
function selectObject(id) {
  state.selectedId = id;
  const obj = selectedObject();
  if (!obj) return;
  $("#selectedName").textContent = obj.name;
  $("#inspectorName").textContent = obj.name;
  $("#inspectorType").textContent = obj.type + " · Entidad";
  $("#objectAvatar").style.background = obj.color + "28";
  $("#objectAvatar").style.color = obj.color;
  $("#posX").value = Math.round(obj.x);
  $("#posY").value = Math.round(obj.y);
  $("#scaleInput").value = obj.scale;
  $("#rotationInput").value = obj.rotation;
  $("#colorInput").value = obj.color;
  $("#visibleInput").checked = obj.visible;
  $("#gravityInput").checked = obj.gravity;
  $("#collisionInput").checked = obj.collision;
  renderObjects();
  drawScene();
}
function addObject() {
  const count = state.objects.filter(o => o.type === "Sprite").length + 1;
  const obj = {id: crypto.randomUUID(), name: "Sprite " + count, x: 180 + count * 35, y: 300, scale: 1, rotation: 0, color: "#e6a65c", visible: true, gravity: false, collision: true, type: "Sprite"};
  state.objects.push(obj);
  selectObject(obj.id);
  log("Objeto creado: " + obj.name, "success");
  updateSaveStatus("Cambios sin guardar");
}
function addPlatform() {
  const obj = {id: crypto.randomUUID(), name: "Platform " + (state.objects.filter(o => o.type === "Platform").length + 1), x: 420, y: 500, scale: 1, rotation: 0, color: "#4dd6a0", visible: true, gravity: false, collision: true, type: "Platform", width: 240, height: 28};
  state.objects.push(obj);
  selectObject(obj.id);
  log("Plataforma creada.", "success");
  updateSaveStatus("Cambios sin guardar");
}
function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bg = ctx.createLinearGradient(0, 0, 0, 720);
  bg.addColorStop(0, "#172743");
  bg.addColorStop(1, "#101b31");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1280, 720);
  if (state.showGrid) {
    ctx.strokeStyle = "rgba(160,185,230,.09)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= 1280; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
    for (let y = 0; y <= 720; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
  }
  ctx.fillStyle = "rgba(87,120,185,.10)";
  ctx.beginPath(); ctx.arc(1000, 130, 150, 0, Math.PI * 2); ctx.fill();
  state.objects.forEach(obj => {
    if (!obj.visible) return;
    ctx.save();
    ctx.translate(obj.x, obj.y);
    ctx.rotate(obj.rotation * Math.PI / 180);
    ctx.scale(obj.scale, obj.scale);
    ctx.fillStyle = obj.color;
    ctx.shadowColor = obj.color;
    ctx.shadowBlur = obj.id === state.selectedId ? 22 : 9;
    if (obj.type === "Platform") {
      const w = obj.width || 240, h = obj.height || 28;
      ctx.beginPath(); ctx.roundRect(-w/2, -h/2, w, h, 8); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.23)"; ctx.fillRect(-w/2 + 8, -h/2 + 3, w - 16, 3);
    } else {
      ctx.beginPath(); ctx.roundRect(-22, -22, 44, 44, 9); ctx.fill();
      ctx.shadowBlur = 0; ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.beginPath(); ctx.arc(-7, -5, 3, 0, Math.PI*2); ctx.arc(7, -5, 3, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 3, 8, .2, Math.PI-.2); ctx.stroke();
    }
    if (obj.id === state.selectedId && !state.running) {
      ctx.shadowBlur = 0; ctx.strokeStyle = "#f2f5ff"; ctx.lineWidth = 2; ctx.setLineDash([7, 5]);
      const w = obj.type === "Platform" ? (obj.width || 240) : 52;
      const h = obj.type === "Platform" ? (obj.height || 28) : 52;
      ctx.strokeRect(-w/2-5, -h/2-5, w+10, h+10);
    }
    ctx.restore();
  });
}
function updateInspector(key, value) {
  const obj = selectedObject();
  if (!obj) return;
  obj[key] = value;
  drawScene();
  updateSaveStatus("Cambios sin guardar");
  if (key === "x" || key === "y") $("#objectCoordinates").textContent = "X: " + Math.round(obj.x) + " · Y: " + Math.round(obj.y);
}
function setMode(mode) {
  state.mode = mode;
  $$(".mode-tab").forEach(btn => btn.classList.toggle("active", btn.dataset.mode === mode));
  $("#blocksWorkspace").classList.toggle("hidden", mode !== "blocks");
  $("#gameWorkspace").classList.toggle("hidden", mode !== "game");
  $("#leftPanelTitle").textContent = mode === "blocks" ? "BLOQUES" : "HERRAMIENTAS";
  $("#libraryTitle").textContent = mode === "blocks" ? "BIBLIOTECA DE BLOQUES" : "OBJETOS Y NIVELES";
  $("#modeLabel").textContent = mode === "blocks" ? "Programación visual" : "Desarrollo de videojuegos";
  $("#editorTitle").textContent = mode === "blocks" ? "Editor de código" : "Editor de escenas";
  if (mode === "game") {
    $("#categoryList").innerHTML = '<button class="category active" data-tool="select">↖ Seleccionar</button><button class="category" data-tool="sprite">▣ Crear sprite</button><button class="category" data-tool="platform">▬ Crear plataforma</button><button class="category" data-tool="grid">▦ Cuadrícula</button>';
    $("#blockLibrary").innerHTML = "";
    const tools = [["＋ Crear sprite","Añade una entidad","sprite"],["▬ Crear plataforma","Añade una plataforma","platform"],["▦ Alternar cuadrícula","Mostrar u ocultar cuadrícula","grid"]];
    tools.forEach(([name, desc, action]) => {
      const btn = document.createElement("button"); btn.className = "block-card game";
      const t = document.createElement("span"); t.textContent = name;
      const d = document.createElement("small"); d.textContent = desc;
      btn.append(t,d); btn.addEventListener("click", () => runTool(action)); $("#blockLibrary").append(btn);
    });
    $("#blockCount").textContent = tools.length;
    $$("#categoryList [data-tool]").forEach(btn => btn.addEventListener("click", () => runTool(btn.dataset.tool)));
  } else {
    $("#categoryList").innerHTML = '<button class="category active" data-category="motion"><i class="cat-dot motion"></i> Movimiento</button><button class="category" data-category="looks"><i class="cat-dot looks"></i> Apariencia</button><button class="category" data-category="events"><i class="cat-dot events"></i> Eventos</button><button class="category" data-category="control"><i class="cat-dot control"></i> Control</button><button class="category" data-category="sensing"><i class="cat-dot sensing"></i> Sensores</button><button class="category" data-category="variables"><i class="cat-dot variables"></i> Variables</button><button class="category" data-category="game"><i class="cat-dot game"></i> Game Engine</button>';
    $$("#categoryList [data-category]").forEach(btn => btn.addEventListener("click", () => {
      state.category = btn.dataset.category;
      $$("#categoryList .category").forEach(b => b.classList.toggle("active", b === btn));
      renderBlockLibrary($("#searchInput").value);
    }));
    renderBlockLibrary($("#searchInput").value);
  }
  drawScene();
}
function runTool(tool) {
  if (tool === "sprite") addObject();
  if (tool === "platform") addPlatform();
  if (tool === "grid") { state.showGrid = !state.showGrid; drawScene(); }
  if (tool === "select") log("Herramienta de selección activa.");
}

const runtime = { variables: { puntos: 0 }, runId: 0, active: false };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function runtimeLog(message) { log("[Programa] " + message, "success"); }
function currentPlayer() { return state.objects.find(o => o.id === state.selectedId) || state.objects.find(o => o.type === "Sprite"); }
function executeSimpleBlock(block) {
  const obj = currentPlayer();
  if (!obj) return;
  const name = block.name.toLowerCase();
  const numbers = name.match(/-?\d+(?:\.\d+)?/g) || [];
  const value = Number(numbers[0] ?? 0);
  if (name.includes("cambiar x")) {
    obj.x += value;
  } else if (name.includes("cambiar y")) {
    obj.y += value;
  } else if (name.includes("fijar x")) {
    obj.x = value;
  } else if (name.includes("fijar y")) {
    obj.y = value;
  } else if (name.includes("ir a x")) {
    obj.x = Number(numbers[0] ?? 0); obj.y = Number(numbers[1] ?? 0);
  } else if (name.includes("apuntar en dirección")) {
    obj.rotation = value;
  } else if (name.includes("mover con velocidad")) {
    obj.x += 5;
  } else if (name.includes("mover")) {
    obj.x += value || 10;
  } else if (name.includes("cambiar dirección")) {
    obj.rotation += value || 15;
  } else if (name.includes("fijar tamaño")) {
    obj.scale = Math.max(.1, value / 100);
  } else if (name.includes("cambiar tamaño")) {
    obj.scale = Math.max(.1, obj.scale + ((value || 10) / 100));
  } else if (name === "mostrar") obj.visible = true;
  else if (name === "ocultar") obj.visible = false;
  else if (name.includes("cambiar efecto de color")) {
    obj.color = ["#6c8cff", "#e6a65c", "#c084fc", "#4dd6a0"][Math.floor(Math.random()*4)];
  } else if (name.includes("fijar puntos")) {
    runtime.variables.puntos = value;
  } else if (name.includes("cambiar puntos")) {
    runtime.variables.puntos += value || 1;
  } else if (name.includes("aplicar gravedad")) {
    obj.gravity = true;
  }
  drawScene();
}
async function executeBlockList(blocks, runId, depth = 0) {
  if (depth > 20) { runtimeLog("Se alcanzó el límite de anidación."); return; }
  for (const block of blocks) {
    if (!state.running || runId !== runtime.runId) return;
    const name = block.name.toLowerCase();
    if (name.includes("por siempre")) {
      let cycles = 0;
      while (state.running && runId === runtime.runId && cycles++ < 10000) {
        await executeBlockList(block.children || [], runId, depth + 1);
        if (!(block.children || []).length) break;
        await sleep(16);
      }
      if (cycles >= 10000) runtimeLog("Bucle detenido por el límite de seguridad.");
      return;
    }
    if (name.includes("repetir")) {
      const count = Math.max(0, Math.min(1000, Number(name.match(/\d+/)?.[0] || 10)));
      for (let i = 0; i < count && state.running && runId === runtime.runId; i++) {
        await executeBlockList(block.children || [], runId, depth + 1);
      }
      continue;
    }
    if (name.includes("si ... entonces")) {
      // El contenedor condicional queda preparado; su condición editable llegará en una versión posterior.
      continue;
    }
    if (name.includes("esperar")) {
      await sleep(Math.max(0, Math.min(30000, Number(name.match(/\d+(?:\.\d+)?/)?.[0] || 1) * 1000)));
    } else if (!name.includes("al pulsar bandera") && !name.includes("al pulsar tecla") && !name.includes("al recibir mensaje")) {
      executeSimpleBlock(block);
      await sleep(16);
    }
  }
}
async function executeBlocks(runId) {
  await executeBlockList(state.blocks, runId);
  if (runId === runtime.runId) runtime.active = false;
}
function runGame() {
  state.running = !state.running;
  $("#runBtn").innerHTML = state.running ? "<span>Ⅱ</span> Pausar" : "<span>▶</span> Ejecutar";
  $("#engineStatus").textContent = state.running ? "Motor en ejecución" : "Motor detenido";
  $("#stageOverlay").classList.toggle("hidden", state.running);
  if (state.running) {
    log(state.mode === "blocks" ? "Programa iniciado." : "Vista previa iniciada.", "success");
    state.lastFrame = 0;
    requestAnimationFrame(gameLoop);
    if (state.mode === "blocks" && state.blocks.length) {
      runtime.runId++;
      runtime.active = true;
      executeBlocks(runtime.runId).then(() => {
        if (!runtime.active && state.running) {
          state.running = false;
          $("#runBtn").innerHTML = "<span>▶</span> Ejecutar";
          $("#engineStatus").textContent = "Programa finalizado";
          $("#stageOverlay").classList.remove("hidden");
        }
      });
    }
  } else {
    runtime.runId++;
    runtime.active = false;
    $("#stageOverlay").classList.remove("hidden");
    log("Ejecución pausada.", "warn");
  }
}
function gameLoop(timestamp) {
  if (!state.running) return;
  const dt = Math.min((timestamp - (state.lastFrame || timestamp)) / 1000, .033);
  state.lastFrame = timestamp;
  const player = state.objects.find(o => o.id === "player");
  const floor = state.objects.find(o => o.type === "Platform");
  if (player && player.gravity) {
    state.gravityVelocity += 1100 * dt;
    player.y += state.gravityVelocity * dt;
    const groundY = floor ? floor.y - (floor.height || 28)/2 - 22 : 680;
    if (player.y >= groundY) { player.y = groundY; state.gravityVelocity = 0; }
  }
  if (player) {
    const speed = 280 * dt;
    if (state.keys.has("ArrowLeft") || state.keys.has("a")) player.x -= speed;
    if (state.keys.has("ArrowRight") || state.keys.has("d")) player.x += speed;
    if (state.keys.has("ArrowUp") || state.keys.has(" ")) { player.y -= speed; }
    player.x = Math.max(24, Math.min(1256, player.x));
  }
  drawScene();
  requestAnimationFrame(gameLoop);
}
function projectData() {
  return {format:"scratch-evolution", version:1, name:$("#projectName").value, mode:state.mode, blocks:state.blocks, objects:state.objects, showGrid:state.showGrid, savedAt:new Date().toISOString()};
}
function saveProject() {
  localStorage.setItem("scratch-evolution-project", JSON.stringify(projectData()));
  updateSaveStatus("Guardado localmente · " + new Date().toLocaleTimeString());
  log("Proyecto guardado en este dispositivo.", "success");
}
function exportProject() {
  const blob = new Blob([JSON.stringify(projectData(), null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = ($("#projectName").value.trim() || "scratch-evolution").replace(/[^a-z0-9-_]/gi,"-") + ".json"; a.click();
  URL.revokeObjectURL(url);
  log("Proyecto JSON exportado.", "success");
}
function importProject(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (data.format !== "scratch-evolution" || !Array.isArray(data.objects) || !Array.isArray(data.blocks)) throw new Error("Formato de proyecto no reconocido.");
      state.blocks = normalizeBlockTree(data.blocks); state.objects = data.objects; state.showGrid = data.showGrid !== false;
      $("#projectName").value = data.name || "Proyecto importado";
      renderScript(); selectObject(state.objects[0]?.id); setMode(data.mode === "game" ? "game" : "blocks");
      log("Proyecto importado correctamente.", "success");
      updateSaveStatus("Proyecto importado");
    } catch (error) { log("No se pudo importar: " + error.message, "warn"); }
  };
  reader.readAsText(file);
}

$$(".mode-tab").forEach(btn => btn.addEventListener("click", () => setMode(btn.dataset.mode)));
$$(".category[data-category]").forEach(btn => btn.addEventListener("click", () => {
  state.category = btn.dataset.category;
  $$(".category").forEach(b => b.classList.toggle("active", b === btn));
  renderBlockLibrary($("#searchInput").value);
}));
$("#searchToggle").addEventListener("click", () => $("#searchWrap").classList.toggle("visible"));
$("#searchInput").addEventListener("input", e => renderBlockLibrary(e.target.value));
$("#addStarter").addEventListener("click", () => {
  const eventBlock = {id: crypto.randomUUID(), name: "Al pulsar bandera verde", description: "Evento de inicio", category: "events"};
  const loopBlock = {id: crypto.randomUUID(), name: "Por siempre", description: "Bucle continuo", category: "control", children: [
    {id: crypto.randomUUID(), name: "Mover 10 pasos", description: "Cambia la posición del objeto", category: "motion"}
  ]};
  state.blocks.push(eventBlock, loopBlock);
  renderScript();
  log("Plantilla inicial creada con un bloque anidado.", "success");
  updateSaveStatus("Cambios sin guardar");
});
$("#runBtn").addEventListener("click", runGame);
$("#saveBtn").addEventListener("click", saveProject);
$("#exportBtn").addEventListener("click", exportProject);
$("#importBtn").addEventListener("click", () => $("#importFile").click());
$("#importFile").addEventListener("change", e => { if (e.target.files[0]) importProject(e.target.files[0]); e.target.value = ""; });
$("#addObject").addEventListener("click", addObject);
$("#addObjectBottom").addEventListener("click", addObject);
$("#deleteObject").addEventListener("click", () => {
  if (state.objects.length <= 1) { log("Debe quedar al menos un objeto.", "warn"); return; }
  state.objects = state.objects.filter(o => o.id !== state.selectedId);
  selectObject(state.objects[0].id); log("Objeto eliminado.", "success"); updateSaveStatus("Cambios sin guardar");
});
$("#addScene").addEventListener("click", () => log("El gestor de múltiples escenas está planificado para una próxima versión.", "warn"));
$("#gridToggle").addEventListener("click", () => { state.showGrid = !state.showGrid; drawScene(); $("#gridToggle").classList.toggle("active", state.showGrid); });
$("#zoomIn").addEventListener("click", () => { state.zoom = Math.min(200, state.zoom + 10); $("#zoomValue").textContent = state.zoom + "%"; $("#stage").style.width = state.zoom + "%"; });
$("#zoomOut").addEventListener("click", () => { state.zoom = Math.max(50, state.zoom - 10); $("#zoomValue").textContent = state.zoom + "%"; $("#stage").style.width = state.zoom + "%"; });
$("#selectTool").addEventListener("click", e => e.currentTarget.classList.toggle("active"));
$$(".right-tab").forEach(btn => btn.addEventListener("click", () => {
  $$(".right-tab").forEach(b => b.classList.toggle("active", b === btn));
  $("#propertiesPanel").classList.toggle("hidden", btn.dataset.right !== "properties");
  $("#objectsPanel").classList.toggle("hidden", btn.dataset.right !== "objects");
}));
[["posX","x",Number],["posY","y",Number],["scaleInput","scale",Number],["rotationInput","rotation",Number],["colorInput","color",String],["visibleInput","visible",Boolean],["gravityInput","gravity",Boolean],["collisionInput","collision",Boolean]].forEach(([id,key,convert]) => {
  $("#"+id).addEventListener("input", e => updateInspector(key, convert(e.target.type === "checkbox" ? e.target.checked : e.target.value)));
});
let sceneDrag = null;
$("#gameCanvas").addEventListener("pointerdown", e => {
  if (state.mode !== "game" || state.running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * canvas.width;
  const y = (e.clientY - rect.top) / rect.height * canvas.height;
  const hit = [...state.objects].reverse().find(o => o.visible && Math.abs(o.x-x) < (o.type === "Platform" ? (o.width||240)/2 : 28) && Math.abs(o.y-y) < (o.type === "Platform" ? (o.height||28)/2 : 28));
  if (hit) {
    selectObject(hit.id);
    sceneDrag = {id: hit.id, dx: hit.x - x, dy: hit.y - y};
    canvas.setPointerCapture(e.pointerId);
  }
});
$("#gameCanvas").addEventListener("pointermove", e => {
  if (!sceneDrag || state.running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * canvas.width;
  const y = (e.clientY - rect.top) / rect.height * canvas.height;
  const obj = state.objects.find(item => item.id === sceneDrag.id);
  if (!obj) return;
  obj.x = Math.round(x + sceneDrag.dx);
  obj.y = Math.round(y + sceneDrag.dy);
  $("#posX").value = obj.x; $("#posY").value = obj.y;
  $("#objectCoordinates").textContent = "X: " + obj.x + " · Y: " + obj.y;
  drawScene();
});
const stopSceneDrag = () => { if (sceneDrag) updateSaveStatus("Cambios sin guardar"); sceneDrag = null; };
$("#gameCanvas").addEventListener("pointerup", stopSceneDrag);
$("#gameCanvas").addEventListener("pointercancel", stopSceneDrag);
window.addEventListener("keydown", e => { if (["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key)) e.preventDefault(); state.keys.add(e.key); });
window.addEventListener("keyup", e => state.keys.delete(e.key));
window.addEventListener("beforeunload", () => { if (state.blocks.length || state.objects.length) localStorage.setItem("scratch-evolution-autosave", JSON.stringify(projectData())); });

const saved = localStorage.getItem("scratch-evolution-autosave") || localStorage.getItem("scratch-evolution-project");
if (saved) {
  try {
    const data = JSON.parse(saved);
    if (data.format === "scratch-evolution") {
      state.blocks = normalizeBlockTree(data.blocks || []); state.objects = data.objects || state.objects; state.showGrid = data.showGrid !== false;
      $("#projectName").value = data.name || "Mi primer proyecto";
      renderScript();
    }
  } catch { /* Se inicia un proyecto nuevo si el autoguardado está dañado. */ }
}
renderBlockLibrary();
renderObjects();
selectObject(state.selectedId);
drawScene();
log("Scratch Evolution v0.3.0 inicializado.");
