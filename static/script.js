// script.js — upgraded with sliding animations, highlights, speed slider & explanations

// Elements
const canvas = document.getElementById('graphCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const generateBtn = document.getElementById('generateBtn');
const startBtn = document.getElementById('startBtn');
const saveBtn = document.getElementById('saveBtn');
const loadBtn = document.getElementById('loadBtn');
const algoSelect = document.getElementById('algorithmSelect');
const sizeInput = document.getElementById('arraySize');
const usernameInput = document.getElementById('username');
const explainBox = document.getElementById('explainBox');
const speedSlider = document.getElementById('speedSlider');
const speedLabel = document.getElementById('speedLabel');

let array = [];               // values for sorting
let bars = [];                // objects: {value, x, width, targetX}
let graph = {};               // adjacency list
let graphNodes = [];          // labels
let nodePositions = [];       // {x,y}
let nodeRadius = 22;
let layoutMode = 'fit';       // future use (toggle layout)
let speed = parseFloat(speedSlider.value); // 0.2x .. 2x

// For responsive canvas
function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * ratio);
  canvas.height = Math.floor((rect.height || 420) * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  drawImmediate();
}
window.addEventListener('resize', resizeCanvas);

// Utility — returns duration (ms) scaled by speed
function duration(ms) {
  // higher speed -> shorter delays
  const s = speed || 1;
  // limit minimal duration
  return Math.max(20, ms / s);
}

// Explanation helper
function setExplanation(txt) {
  explainBox.textContent = txt;
}

// Sleep with ability to be adjusted by slider
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, duration(ms)));
}

// Initial draw (blank)
function drawImmediate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (bars.length) drawBars();
  else if (nodePositions.length) drawGraph();
}
resizeCanvas();

// ------------------ BAR (sorting) helpers ------------------
function initBarsFromArray(arr) {
  array = arr.slice();
  bars = [];
  const canvasW = canvas.clientWidth;
  const total = array.length;
  const gap = Math.max(4, Math.floor(canvasW / (total * 35)));
  const width = Math.max(8, Math.floor((canvasW - gap * (total + 1)) / total));
  // center vertically, map values to heights
  const maxVal = Math.max(...array, 1);
  for (let i = 0; i < total; i++) {
    const x = gap + i * (width + gap);
    const h = Math.max(12, Math.floor((canvas.clientHeight - 40) * (array[i] / maxVal)));
    bars.push({ value: array[i], x: x, width: width, height: h, targetX: x });
  }
  drawBars();
}

function drawBars(activeIndices = [], swapIndices = []) {
  const ch = canvas.clientHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // background edges for graph (if any)
  if (nodePositions.length && (!bars.length)) drawGraphBackground();

  // draw bars at current x
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const x = b.x;
    const w = b.width;
    const h = b.height;
    // color rules
    let fill = '#4CAF50';
    if (swapIndices.includes(i)) fill = '#ef4444'; // swap color
    else if (activeIndices.includes(i)) fill = '#f59e0b'; // compare color
    // draw
    ctx.fillStyle = fill;
    const y = canvas.clientHeight - h - 10;
    roundRect(ctx, x, y, w, h, 6, true, false);
    // label
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(10, Math.floor(w / 2))}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.value), x + w / 2, y + h / 2);
  }
}

// helper to draw rounded rects
function roundRect(ctx, x, y, w, h, r = 4, fill = true, stroke = true) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}

// animate bars to their targetX positions
function animatePositions(durationMs = 300) {
  return new Promise(resolve => {
    const start = performance.now();
    const initial = bars.map(b => b.x);
    const targets = bars.map(b => b.targetX);
    function frame(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const ease = easeInOutCubic(t);
      for (let i = 0; i < bars.length; i++) {
        bars[i].x = initial[i] + (targets[i] - initial[i]) * ease;
      }
      drawBars();
      if (t < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// swap two bar objects (with sliding)
async function animateSwap(i, j) {
  setExplanation(`Swapping ${bars[i].value} and ${bars[j].value}`);
  // swap targetX positions
  const tx = bars[i].targetX;
  bars[i].targetX = bars[j].targetX;
  bars[j].targetX = tx;
  // visually mark as swapIndices until done
  const dur = duration(420);
  const p = animatePositions(dur);
  // wait a bit and then swap underlying bar objects (so heights/values move with position)
  await p;
  // swap data in array order so future logic works
  const temp = bars[i];
  bars[i] = bars[j];
  bars[j] = temp;
  // after swap, align targetX values to current index positions to avoid duplicates
  for (let k = 0; k < bars.length; k++) {
    bars[k].targetX = bars[k].x; // lock
  }
  drawBars();
  await sleep(50);
}

// visual compare highlight (brief)
async function animateCompare(i, j) {
  setExplanation(`Comparing ${bars[i].value} and ${bars[j].value}`);
  drawBars([i, j], []);
  await sleep(160);
  drawBars();
}

// ------------------ Sorting Implementations ------------------
// Bubble sort using animation helpers
async function bubbleSort() {
  const n = bars.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      await animateCompare(j, j + 1);
      if (bars[j].value > bars[j + 1].value) {
        await animateSwap(j, j + 1);
      }
    }
  }
  setExplanation('Bubble Sort complete.');
}

// Quick Sort with animation
async function quickSortWrapper(low = 0, high = bars.length - 1) {
  if (low < high) {
    const pi = await partition(low, high);
    await quickSortWrapper(low, pi - 1);
    await quickSortWrapper(pi + 1, high);
  }
}

async function partition(low, high) {
  const pivotVal = bars[high].value;
  setExplanation(`Partitioning with pivot ${pivotVal}`);
  let i = low - 1;
  for (let j = low; j < high; j++) {
    await animateCompare(j, high);
    if (bars[j].value < pivotVal) {
      i++;
      if (i !== j) await animateSwap(i, j);
    }
  }
  if (i + 1 !== high) await animateSwap(i + 1, high);
  return i + 1;
}

// Merge Sort — we will simulate by rebuilding arrays and animating moves
async function mergeSortWrapper(left = 0, right = bars.length - 1) {
  if (left >= right) return;
  const mid = Math.floor((left + right) / 2);
  await mergeSortWrapper(left, mid);
  await mergeSortWrapper(mid + 1, right);
  await merge(left, mid, right);
}

async function merge(left, mid, right) {
  setExplanation(`Merging segments [${left}, ${mid}] and [${mid + 1}, ${right}]`);
  const leftPart = bars.slice(left, mid + 1).map(b => b.value);
  const rightPart = bars.slice(mid + 1, right + 1).map(b => b.value);
  let i = 0, j = 0, k = left;
  while (i < leftPart.length && j < rightPart.length) {
    // highlight position k
    drawBars([k], []);
    await sleep(160);
    if (leftPart[i] <= rightPart[j]) {
      bars[k].value = leftPart[i++];
    } else {
      bars[k].value = rightPart[j++];
    }
    // update height to reflect value
    updateBarHeights();
    drawBars([k], []);
    await sleep(220);
    k++;
  }
  while (i < leftPart.length) {
    bars[k].value = leftPart[i++];
    updateBarHeights();
    drawBars([k], []);
    await sleep(180);
    k++;
  }
  while (j < rightPart.length) {
    bars[k].value = rightPart[j++];
    updateBarHeights();
    drawBars([k], []);
    await sleep(180);
    k++;
  }
}

// update heights mapping values -> heights (keeps positions)
function updateBarHeights() {
  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const maxH = canvas.clientHeight - 40;
  bars.forEach(b => {
    b.height = Math.max(12, Math.floor((maxH) * (b.value / maxVal)));
  });
}

// ------------------ GRAPH drawing & BFS/DFS animations ------------------
function generateGraphVisual(n) {
  graph = {};
  graphNodes = [];
  nodePositions = [];
  const W = canvas.clientWidth, H = canvas.clientHeight;
  for (let i = 0; i < n; i++) {
    graph[i] = [];
    graphNodes.push(i);
    // place nodes in circle-ish or random
    const theta = (i / n) * Math.PI * 2;
    const cx = W / 2 + Math.cos(theta) * (Math.min(W, H) / 3) + (Math.random() - 0.5) * 40;
    const cy = H / 2 + Math.sin(theta) * (Math.min(W, H) / 3) + (Math.random() - 0.5) * 40;
    nodePositions.push({ x: cx, y: cy, targetX: cx, targetY: cy });
  }
  // random undirected edges
  for (let i = 0; i < n; i++) {
    const edges = Math.floor(Math.random() * Math.max(1, n / 3));
    for (let j = 0; j < edges; j++) {
      const t = Math.floor(Math.random() * n);
      if (t !== i && !graph[i].includes(t)) {
        graph[i].push(t);
        graph[t].push(i);
      }
    }
  }
  drawGraph();
}

function drawGraph(activeNodes = [], highlightedEdges = []) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // draw edges
  for (let i = 0; i < nodePositions.length; i++) {
    for (const nb of graph[i]) {
      if (i < nb) {
        drawEdge(i, nb, highlightedEdges.some(e => (e[0] === i && e[1] === nb) || (e[0] === nb && e[1] === i)));
      }
    }
  }
  // draw nodes
  for (let i = 0; i < nodePositions.length; i++) {
    const p = nodePositions[i];
    const active = activeNodes.includes(i);
    drawNode(i, p.x, p.y, active);
  }
}

function drawEdge(a, b, highlighted = false) {
  const pa = nodePositions[a], pb = nodePositions[b];
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.strokeStyle = highlighted ? '#f97316' : '#94a3b8';
  ctx.lineWidth = highlighted ? 4 : 2;
  ctx.stroke();
}

function drawNode(i, x, y, active = false) {
  ctx.beginPath();
  ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
  ctx.fillStyle = active ? '#ef4444' : '#06b6d4';
  ctx.fill();
  ctx.strokeStyle = '#0f172a22';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(i), x, y);
}

// highlight an edge with a brief animation
async function animateEdgeHighlight(a, b) {
  setExplanation(`Visiting edge ${a} → ${b}`);
  const steps = 6;
  for (let t = 0; t < steps; t++) {
    drawGraph([], [[a, b]]);
    await sleep(80);
  }
  // small pause
  await sleep(120);
}

// BFS & DFS
async function bfs(start = 0) {
  const n = nodePositions.length;
  const visited = Array(n).fill(false);
  const q = [start];
  visited[start] = true;
  while (q.length) {
    const node = q.shift();
    setExplanation(`Visiting node ${node}`);
    drawGraph([node]);
    await sleep(260);
    for (const nb of graph[node]) {
      if (!visited[nb]) {
        visited[nb] = true;
        q.push(nb);
        await animateEdgeHighlight(node, nb);
      }
    }
  }
  setExplanation('BFS complete.');
}
async function dfs(node = 0, visited = new Set()) {
  visited.add(node);
  setExplanation(`Visiting node ${node}`);
  drawGraph([node]);
  await sleep(260);
  for (const nb of graph[node]) {
    if (!visited.has(nb)) {
      await animateEdgeHighlight(node, nb);
      await dfs(nb, visited);
    }
  }
  if (visited.size === nodePositions.length) setExplanation('DFS complete.');
}

// ------------------ UI wiring ------------------
function generateArray() {
  const size = Math.max(5, Math.min(30, parseInt(sizeInput.value) || 12));
  // If algorithm is graph-based, generate graph
  if (algoSelect.value === 'bfs' || algoSelect.value === 'dfs') {
    generateGraphVisual(size);
  } else {
    // generate numeric array
    const arr = [];
    for (let i = 0; i < size; i++) arr.push(Math.floor(Math.random() * 100) + 5);
    initBarsFromArray(arr);
    setExplanation('Random array generated.');
  }
}

async function startVisualization() {
  const algo = algoSelect.value;
  // disable controls while running
  setControlsEnabled(false);
  try {
    if (algo === 'bubble') {
      await bubbleSort();
    } else if (algo === 'quick') {
      await quickSortWrapper(0, bars.length - 1);
      setExplanation('Quick Sort complete.');
    } else if (algo === 'merge') {
      await mergeSortWrapper(0, bars.length - 1);
      setExplanation('Merge Sort complete.');
    } else if (algo === 'bfs') {
      if (!nodePositions.length) generateGraphVisual(8);
      await bfs(0);
    } else if (algo === 'dfs') {
      if (!nodePositions.length) generateGraphVisual(8);
      await dfs(0, new Set());
    }
  } catch (err) {
    console.error(err);
  } finally {
    setControlsEnabled(true);
  }
}

function setControlsEnabled(enabled) {
  generateBtn.disabled = !enabled;
  startBtn.disabled = !enabled;
  saveBtn.disabled = !enabled;
  loadBtn.disabled = !enabled;
  algoSelect.disabled = !enabled;
  sizeInput.disabled = !enabled;
}

// Save/load (Flask endpoints)
function saveArrayToServer() {
  // only saves the numeric array, not graph
  if (!bars.length) { alert('No array to save. Generate an array first.'); return; }
  const arr = bars.map(b => b.value);
  const username = usernameInput.value.trim() || 'guest';
  fetch('/save_array', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username, array: arr })
  }).then(r => r.json()).then(data => setExplanation(data.message)).catch(err => setExplanation('Save failed.'));
}

function loadArrayFromServer() {
  const username = usernameInput.value.trim() || 'guest';
  fetch(`/load_array/${username}`)
    .then(r => r.json())
    .then(data => {
      if (!data.array || !data.array.length) {
        setExplanation('No saved array for that user.');
        return;
      }
      initBarsFromArray(data.array);
      setExplanation('Loaded saved array.');
    })
    .catch(err => setExplanation('Load failed.'));
}

// handle speed slider change
speedSlider.addEventListener('input', () => {
  speed = parseFloat(speedSlider.value);
  speedLabel.textContent = `${speed.toFixed(1)}x`;
});

// events
generateBtn.addEventListener('click', generateArray);
startBtn.addEventListener('click', startVisualization);
saveBtn.addEventListener('click', saveArrayToServer);
loadBtn.addEventListener('click', loadArrayFromServer);
window.addEventListener('load', () => {
  // initial generation
  generateArray();
  setExplanation('Ready. Use Generate/Start. Speed controls animations.');
  speedLabel.textContent = `${speed.toFixed(1)}x`;
});

// canvas touch interaction for graph nodes
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  if (!nodePositions.length) return;
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  const x = touch.clientX - rect.left;
  const y = touch.clientY - rect.top;
  for (let i = 0; i < nodePositions.length; i++) {
    const dx = x - nodePositions[i].x, dy = y - nodePositions[i].y;
    if (Math.sqrt(dx * dx + dy * dy) <= nodeRadius * 1.1) {
      setExplanation(`Touched node ${i}.`);
      // highlight touched node briefly
      drawGraph([i]);
      setTimeout(() => drawGraph(), duration(300));
      break;
    }
  }
});

// click resize on toggle layout (placeholder)
document.getElementById('toggleLayout').addEventListener('click', () => {
  setExplanation('Toggle layout pressed (placeholder).');
});

// helper to draw graph background only
function drawGraphBackground() {
  // optional: draw nothing for now
}

// initialize a default array on load (done after load event)
