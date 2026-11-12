const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const blockDefinitions = {
  motion: [
    ["Mover 10 pasos", "Cambia la posición del objeto", "motion"],
    ["Ir a X: 0 Y: 0", "Establece una posición", "motion"],
    ["Cambiar dirección 15°", "Rota el objeto", "motion"],
    ["Deslizar en 1 segundo", "Movimiento interpolado", "motion"]
  ],
  looks: [
    ["Cambiar tamaño 10%", "Modifica la escala", "looks"],
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
    button.addEventListener("click", () => addBlock(name, description, category));
    $("#blockLibrary").append(button);
  });
}
function addBlock(name, description, category) {
  state.blocks.push({id: crypto.randomUUID(), name, description, category});
  renderScript();
  $("#emptyBlocks").classList.add("hidden");
  log("Bloque añadido: " + name, "success");
  updateSaveStatus("Cambios sin guardar");
}
function renderScript() {
  const stack = $("#scriptStack");
  stack.innerHTML = "";
  state.blocks.forEach(block => {
    const el = document.createElement("div");
    el.className = "script-block " + block.category;
    const remove = document.createElement("button");
    remove.className = "script-remove";
    remove.textContent = "×";
    remove.title = "Eliminar bloque";
    remove.addEventListener("click", () => {
      state.blocks = state.blocks.filter(b => b.id !== block.id);
      renderScript();
      $("#emptyBlocks").classList.toggle("hidden", state.blocks.length > 0);
      updateSaveStatus("Cambios sin guardar");
    });
    const label = document.createElement("span");
    label.textContent = block.name;
    const detail = document.createElement("small");
    detail.textContent = block.description;
    el.append(remove, label, detail);
    stack.append(el);
  });
  $("#emptyBlocks").classList.toggle("hidden", state.blocks.length > 0);
}
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
  if (name.includes("mover")) {
    const amount = Number(name.match(/-?\\d+/)?.[0] || 10);
    obj.x += amount;
  } else if (name.includes("ir a x")) {
    const nums = name.match(/-?\\d+(?:\\.\\d+)?/g) || [];
    obj.x = Number(nums[0] ?? 0); obj.y = Number(nums[1] ?? 0);
  } else if (name.includes("cambiar dirección")) {
    obj.rotation += Number(name.match(/-?\\d+/)?.[0] || 15);
  } else if (name.includes("cambiar tamaño")) {
    obj.scale = Math.max(.1, obj.scale + (Number(name.match(/-?\\d+/)?.[0] || 10) / 100));
  } else if (name === "mostrar") obj.visible = true;
  else if (name === "ocultar") obj.visible = false;
  else if (name.includes("cambiar efecto de color")) {
    obj.color = ["#6c8cff", "#e6a65c", "#c084fc", "#4dd6a0"][Math.floor(Math.random()*4)];
  } else if (name.includes("fijar puntos")) {
    runtime.variables.puntos = Number(name.match(/-?\\d+/)?.[0] || 0);
  } else if (name.includes("cambiar puntos")) {
    runtime.variables.puntos += Number(name.match(/-?\\d+/)?.[0] || 1);
  } else if (name.includes("aplicar gravedad")) {
    obj.gravity = true;
  } else if (name.includes("mover con velocidad")) {
    obj.x += 5;
  }
  drawScene();
}
async function executeBlocks(runId) {
  let pc = 0, operations = 0;
  const blocks = state.blocks;
  while (state.running && runId === runtime.runId && pc < blocks.length && operations < 10000) {
    const block = blocks[pc++];
    const name = block.name.toLowerCase();
    operations++;
    if (name.includes("al pulsar bandera")) {
      // Bloque de evento: inicia la secuencia y no realiza una acción por sí mismo.
    } else if (name.includes("por siempre")) {
      const body = blocks.slice(pc);
      while (state.running && runId === runtime.runId) {
        for (const child of body) {
          if (!state.running || runId !== runtime.runId) break;
          if (child.name.toLowerCase().includes("esperar")) {
            await sleep(1000);
          } else executeSimpleBlock(child);
          await sleep(16);
        }
        if (!body.length) break;
      }
      break;
    } else if (name.includes("repetir")) {
      const count = Math.max(0, Math.min(1000, Number(name.match(/\\d+/)?.[0] || 10)));
      const body = blocks.slice(pc);
      for (let i = 0; i < count && state.running && runId === runtime.runId; i++) {
        for (const child of body) {
          if (!state.running || runId !== runtime.runId) break;
          if (child.name.toLowerCase().includes("esperar")) await sleep(1000);
          else executeSimpleBlock(child);
          await sleep(16);
        }
      }
      break;
    } else if (name.includes("esperar")) {
      await sleep(Math.max(0, Math.min(30000, Number(name.match(/\\d+(?:\\.\\d+)?/)?.[0] || 1) * 1000)));
    } else {
      executeSimpleBlock(block);
      await sleep(16);
    }
  }
  if (operations >= 10000) runtimeLog("Se detuvo la secuencia por alcanzar el límite de seguridad.");
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
      state.blocks = data.blocks; state.objects = data.objects; state.showGrid = data.showGrid !== false;
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
  addBlock("Al pulsar bandera verde", "Evento de inicio", "events");
  addBlock("Por siempre", "Bucle continuo", "control");
  addBlock("Mover 10 pasos", "Cambia la posición del objeto", "motion");
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
$("#gameCanvas").addEventListener("pointerdown", e => {
  if (state.mode !== "game" || state.running) return;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width * canvas.width;
  const y = (e.clientY - rect.top) / rect.height * canvas.height;
  const hit = [...state.objects].reverse().find(o => Math.abs(o.x-x) < (o.type === "Platform" ? (o.width||240)/2 : 28) && Math.abs(o.y-y) < (o.type === "Platform" ? (o.height||28)/2 : 28));
  if (hit) selectObject(hit.id);
});
window.addEventListener("keydown", e => { if (["ArrowLeft","ArrowRight","ArrowUp"," "].includes(e.key)) e.preventDefault(); state.keys.add(e.key); });
window.addEventListener("keyup", e => state.keys.delete(e.key));
window.addEventListener("beforeunload", () => { if (state.blocks.length || state.objects.length) localStorage.setItem("scratch-evolution-autosave", JSON.stringify(projectData())); });

const saved = localStorage.getItem("scratch-evolution-autosave") || localStorage.getItem("scratch-evolution-project");
if (saved) {
  try {
    const data = JSON.parse(saved);
    if (data.format === "scratch-evolution") {
      state.blocks = data.blocks || []; state.objects = data.objects || state.objects; state.showGrid = data.showGrid !== false;
      $("#projectName").value = data.name || "Mi primer proyecto";
      renderScript();
    }
  } catch { /* Se inicia un proyecto nuevo si el autoguardado está dañado. */ }
}
renderBlockLibrary();
renderObjects();
selectObject(state.selectedId);
drawScene();
log("Scratch Evolution v0.1.0 inicializado.");
