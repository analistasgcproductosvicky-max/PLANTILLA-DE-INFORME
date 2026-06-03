'use strict';

/* ══════════════════════════════════════════════
   CONFIGURACIÓN — editar aquí los responsables
══════════════════════════════════════════════ */
const PERSONAS = [
  'Juan Sebastián Parra','Oscar Bautista','Juan Pablo Rodríguez',
  'Yennireth Villarreal','Gloria Hernández','Valeria Hernández',
  'Cristian Aranda','Ángel Ramírez','Katherine Florez',
  'María Alejandra Cárdenas','Ely Padilla'
];

const PERSONAS_AREA = {
  empaque: PERSONAS, extruido: PERSONAS, rosquilla: PERSONAS,
  tortillas: PERSONAS, trocillo: PERSONAS,
  daf: PERSONAS, pc4: PERSONAS, pc6: PERSONAS,
  pellet: PERSONAS, mp: PERSONAS
};

const SECCIONES_PE = ['extruido','rosquilla','tortillas','trocillo','daf','pc4','pc6','pellet'];
const LABEL_SEC = {
  extruido:'Extruido', rosquilla:'Rosquilla', tortillas:'Tortillas',
  trocillo:'Trocillo', daf:'Papa DAF', pc4:'Papa PC4', pc6:'Papa PC6', pellet:'Pellet'
};

/* ══════ ESTADO ══════ */
let tipoActual = '';
let borradorId = '';
let autoTimer  = null;
let presenciaRemota = {};
let estadosRemotos  = {};
let seccionAbierta  = '';

/* ══════ HELPERS HTML ══════ */
function sec(id, icon, titulo, cuerpo) {
  return `<div class="seccion" id="sec-${id}">
    <div class="sec-header" onclick="toggleSec(this)">
      <div class="sec-icon">${icon}</div>
      <div class="sec-titulo">${titulo}</div>
      <span class="sec-chev">▼</span>
    </div>
    <div class="sec-body">${cuerpo}</div>
  </div>`;
}

function mkResp(area, label) {
  const rid = 'resp-' + area;
  const items = (PERSONAS_AREA[area]||[]).map(p =>
    `<div class="resp-menu-item" onclick="agregarResp('${rid}','${p}','menu-${rid}')">${p}</div>`
  ).join('');
  return `<div class="resp-area">
    <span class="resp-lbl">👤 ${label}:</span>
    <div class="resp-tags" id="${rid}"></div>
    <div class="resp-drop">
      <button class="resp-add" onclick="toggleRespMenu('menu-${rid}')">+ Agregar</button>
      <div class="resp-menu" id="menu-${rid}">${items}</div>
    </div>
  </div>`;
}

function tbl(id, headers, rows = 2) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const tds = headers.map(() => `<td><input type="text" oninput="autoSave()"></td>`).join('');
  const rs  = Array.from({length: rows}, () => `<tr>${tds}</tr>`).join('');
  return `<div class="twrap"><table class="reg" id="${id}">
    <thead><tr>${ths}</tr></thead><tbody>${rs}</tbody>
  </table></div>
  <button class="btn-add" onclick="addRow('${id}',${headers.length})">+ Agregar fila</button>`;
}

function tblSel(id, headers, selCol, opts = ['Sí','No'], rows = 2) {
  const ths = headers.map(h => `<th>${h}</th>`).join('');
  const rs = Array.from({length: rows}, () => {
    const tds = headers.map((h, i) => {
      if(i === selCol) {
        const ops = opts.map(o => `<option>${o}</option>`).join('');
        return `<td><select onchange="autoSave()">${ops}</select></td>`;
      }
      return `<td><input type="text" oninput="autoSave()"></td>`;
    }).join('');
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<div class="twrap"><table class="reg" id="${id}">
    <thead><tr>${ths}</tr></thead><tbody>${rs}</tbody>
  </table></div>
  <button class="btn-add" onclick="addRowSel('${id}',${JSON.stringify(headers.map((_,i)=>i===selCol?'sel':'txt'))})">+ Agregar fila</button>`;
}

function foto(labelBtn, sub) {
  return `<div class="fzona" onclick="this.querySelector('input').click()">
    <input type="file" accept="image/*" multiple onchange="agregarFotos(this)">
    <div>📷 ${labelBtn}</div>
    <div class="fzona-txt">${sub}</div>
  </div><div class="fgrid"></div>`;
}

// Pregunta Si/No con bloque condicional
function preg(num, txt, key, condSi = '', condNo = '') {
  return `<div class="pregunta" id="preg-${key}">
    <div class="preg-label"><span class="pnum">${num}</span>${txt}</div>
    <div class="sino-row" data-key="${key}">
      <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
      <button class="rbtn" onclick="siNo(this,'no')">No</button>
    </div>
    ${condSi ? `<div class="cond-si" style="display:none">${condSi}</div>` : ''}
    ${condNo ? `<div class="cond-no" style="display:none">${condNo}</div>` : ''}
  </div>`;
}

// Pregunta solo texto (sin Si/No)
function pregTxt(num, txt, key, ph) {
  return `<div class="pregunta">
    <div class="preg-label"><span class="pnum">${num}</span>${txt}</div>
    <textarea class="rdet" data-campo="${key}" placeholder="${ph}" oninput="autoSave()"></textarea>
  </div>`;
}

/* ══════ INTERACCIÓN ══════ */
function toggleSec(header) {
  const body = header.nextElementSibling;
  const ch   = header.querySelector('.sec-chev');
  const ab   = body.classList.toggle('ab');
  ch.classList.toggle('ab', ab);
  if(ab) {
    const s = header.closest('.seccion');
    if(s && s.id) marcarPresencia(s.id.replace('sec-',''));
  }
}

function siNo(btn, val) {
  const row  = btn.closest('.sino-row');
  row.querySelectorAll('.rbtn').forEach(b => b.classList.remove('si','no'));
  btn.classList.add(val);
  const preg = row.closest('.pregunta');
  if(preg) {
    const cs = preg.querySelector('.cond-si');
    const cn = preg.querySelector('.cond-no');
    if(cs) cs.style.display = val === 'si' ? 'block' : 'none';
    if(cn) cn.style.display = val === 'no' ? 'block' : 'none';
    const det = preg.querySelector(':scope > textarea.rdet, :scope > input.rinp');
    if(det) { det.disabled = val === 'no'; if(val === 'no') det.value = ''; }
  }
  const s = btn.closest('.seccion');
  if(s) actualizarTab(s.id.replace('sec-',''));
  autoSave();
}

function addRow(id, n) {
  const tb = document.getElementById(id)?.querySelector('tbody');
  if(!tb) return;
  const tr = document.createElement('tr');
  for(let i = 0; i < n; i++) {
    const td = document.createElement('td');
    const inp = document.createElement('input'); inp.type = 'text';
    inp.addEventListener('input', autoSave);
    td.appendChild(inp); tr.appendChild(td);
  }
  tb.appendChild(tr);
}

function addRowSel(id, tipos) {
  const tb = document.getElementById(id)?.querySelector('tbody');
  if(!tb) return;
  const tr = document.createElement('tr');
  tipos.forEach(t => {
    const td = document.createElement('td');
    if(t === 'sel') {
      const sel = document.createElement('select');
      ['Sí','No'].forEach(o => { const op = document.createElement('option'); op.textContent = o; sel.appendChild(op); });
      sel.addEventListener('change', autoSave); td.appendChild(sel);
    } else {
      const inp = document.createElement('input'); inp.type = 'text';
      inp.addEventListener('input', autoSave); td.appendChild(inp);
    }
    tr.appendChild(td);
  });
  tb.appendChild(tr);
}

function agregarFotos(input) {
  const grid = input.closest('.fzona').nextElementSibling;
  Array.from(input.files).forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const item = document.createElement('div'); item.className = 'fitem';
      const img  = document.createElement('img'); img.src = e.target.result; img.className = 'fthumb';
      img.onclick = () => verFoto(img.src);
      const del  = document.createElement('button'); del.className = 'fdel'; del.textContent = '×';
      del.onclick = () => { item.remove(); autoSave(); };
      const cap  = document.createElement('input'); cap.type = 'text'; cap.className = 'fcap-inp';
      cap.placeholder = 'Descripción...';
      cap.addEventListener('input', autoSave);
      item.appendChild(img); item.appendChild(del); item.appendChild(cap);
      grid.appendChild(item);
      autoSave();
    };
    reader.readAsDataURL(file);
  });
  input.value = '';
}

function verFoto(src) {
  const m = document.createElement('div'); m.className = 'foto-modal';
  m.innerHTML = `<button class="foto-modal-close" onclick="this.parentElement.remove()">×</button>
    <img src="${src}">`;
  m.onclick = e => { if(e.target === m) m.remove(); };
  document.body.appendChild(m);
}

/* ══════ RESPONSABLES ══════ */
function toggleRespMenu(id) {
  document.querySelectorAll('.resp-menu.show').forEach(m => { if(m.id !== id) m.classList.remove('show'); });
  document.getElementById(id)?.classList.toggle('show');
}
document.addEventListener('click', e => {
  if(!e.target.closest('.resp-drop')) document.querySelectorAll('.resp-menu.show').forEach(m => m.classList.remove('show'));
});

function agregarResp(tagsId, nombre, menuId) {
  const tags = document.getElementById(tagsId);
  if(!tags) return;
  if([...tags.querySelectorAll('.resp-tag')].some(t => t.dataset.nombre === nombre)) {
    document.getElementById(menuId)?.classList.remove('show'); return;
  }
  const tag = document.createElement('div'); tag.className = 'resp-tag'; tag.dataset.nombre = nombre;
  tag.innerHTML = `${nombre}<button onclick="this.parentElement.remove();autoSave()" title="Quitar">×</button>`;
  tags.appendChild(tag);
  document.getElementById(menuId)?.classList.remove('show');
  autoSave();
}

function getResp(area) {
  const tags = document.querySelectorAll(`[id^="resp-${area}"] .resp-tag`);
  return [...tags].map(t => t.dataset.nombre || t.textContent.replace('×','').trim());
}

/* ══════ GUARDADO ══════ */
function autoSave() {
  clearTimeout(autoTimer);
  document.getElementById('autosave-lbl').textContent = '☁️ Guardando...';
  autoTimer = setTimeout(guardarNube, 1500);
}

async function guardarNube() {
  if(!window._fb) { document.getElementById('autosave-lbl').textContent = '⚠️ Sin conexión'; return; }
  const ok = await window._fb.guardar(borradorId, recopilarDatos());
  document.getElementById('autosave-lbl').textContent = ok ? '☁️ Guardado' : '⚠️ Error al guardar';
}

async function guardarBorrador() {
  const err = validar();
  if(err.length) { mostrarModal(err); return; }
  await guardarNube();
  toast('✓ Guardado en la nube', 'verde');
}

/* ══════ RECOPILAR / RESTAURAR ══════ */
function recopilarDatos() {
  const d = { tipo: tipoActual };
  // Campos data-campo
  document.querySelectorAll('[data-campo]').forEach(el => {
    d[el.dataset.campo] = el.type === 'checkbox' ? el.checked : el.value;
  });
  // Si/No
  const sinos = {};
  document.querySelectorAll('.sino-row').forEach(row => {
    const act = row.querySelector('.rbtn.si,.rbtn.no');
    if(row.dataset.key) sinos[row.dataset.key] = act ? (act.classList.contains('si') ? 'si' : 'no') : '';
  });
  d._sinos = sinos;
  // Responsables
  const resp = {};
  document.querySelectorAll('[id^="resp-"]').forEach(tags => { resp[tags.id] = [...tags.querySelectorAll('.resp-tag')].map(t => t.dataset.nombre); });
  d._resp = resp;
  // Fotos
  const fotos = {};
  document.querySelectorAll('.fgrid').forEach((grid, i) => {
    if(!grid.dataset.fid) grid.dataset.fid = 'fg' + i;
    const items = [...grid.querySelectorAll('.fitem')].map(item => ({
      src: item.querySelector('img')?.src || '',
      cap: item.querySelector('.fcap-inp')?.value || ''
    })).filter(f => f.src);
    if(items.length) fotos[grid.dataset.fid] = items;
  });
  d._fotos = fotos;
  // Tablas
  const tablas = {};
  document.querySelectorAll('table.reg[id]').forEach(t => {
    tablas[t.id] = [...t.querySelectorAll('tbody tr')].map(tr => [...tr.querySelectorAll('input,select')].map(el => el.value));
  });
  d._tablas = tablas;
  return d;
}

function restaurarDatos(d) {
  if(!d) return;
  document.querySelectorAll('[data-campo]').forEach(el => {
    const v = d[el.dataset.campo];
    if(v !== undefined) { if(el.type === 'checkbox') el.checked = v; else el.value = v; }
  });
  if(d._sinos) {
    document.querySelectorAll('.sino-row').forEach(row => {
      const val = d._sinos[row.dataset.key];
      if(!val) return;
      row.querySelectorAll('.rbtn').forEach(b => b.classList.remove('si','no'));
      const btn = [...row.querySelectorAll('.rbtn')].find(b =>
        (val === 'si' && b.textContent.trim() === 'Sí') || (val === 'no' && b.textContent.trim() === 'No'));
      if(btn) {
        btn.classList.add(val);
        const p = row.closest('.pregunta');
        if(p) {
          const cs = p.querySelector('.cond-si'); const cn = p.querySelector('.cond-no');
          if(cs) cs.style.display = val === 'si' ? 'block' : 'none';
          if(cn) cn.style.display = val === 'no' ? 'block' : 'none';
          const det = p.querySelector(':scope > textarea.rdet, :scope > input.rinp');
          if(det && val === 'no') { det.disabled = true; det.value = ''; }
        }
      }
    });
  }
  if(d._resp) {
    Object.entries(d._resp).forEach(([id, nombres]) => {
      const tags = document.getElementById(id);
      if(!tags || !nombres?.length) return;
      tags.innerHTML = '';
      nombres.forEach(nombre => {
        if(!nombre) return;
        const tag = document.createElement('div'); tag.className = 'resp-tag'; tag.dataset.nombre = nombre;
        tag.innerHTML = `${nombre}<button onclick="this.parentElement.remove();autoSave()">×</button>`;
        tags.appendChild(tag);
      });
    });
  }
  if(d._fotos) {
    document.querySelectorAll('.fgrid').forEach((grid, i) => {
      if(!grid.dataset.fid) grid.dataset.fid = 'fg' + i;
      const items = d._fotos[grid.dataset.fid];
      if(!items?.length) return;
      grid.innerHTML = '';
      items.forEach(f => {
        if(!f.src) return;
        const item = document.createElement('div'); item.className = 'fitem';
        const img = document.createElement('img'); img.src = f.src; img.className = 'fthumb';
        img.onclick = () => verFoto(img.src);
        const del = document.createElement('button'); del.className = 'fdel'; del.textContent = '×';
        del.onclick = () => { item.remove(); autoSave(); };
        const cap = document.createElement('input'); cap.type = 'text'; cap.className = 'fcap-inp';
        cap.placeholder = 'Descripción...'; cap.value = f.cap || '';
        cap.addEventListener('input', autoSave);
        item.appendChild(img); item.appendChild(del); item.appendChild(cap);
        grid.appendChild(item);
      });
    });
  }
  if(d._tablas) {
    Object.entries(d._tablas).forEach(([tid, filas]) => {
      const t = document.getElementById(tid); if(!t) return;
      const tb = t.querySelector('tbody');
      const cols = filas[0]?.length || 0;
      while(tb.rows.length < filas.length) addRow(tid, cols);
      [...tb.rows].forEach((tr, ri) => {
        if(!filas[ri]) return;
        [...tr.querySelectorAll('input,select')].forEach((el, ci) => {
          if(filas[ri][ci] !== undefined) el.value = filas[ri][ci];
        });
      });
    });
  }
}

/* ══════ MENÚ / NAVEGACIÓN ══════ */
function abrirFormulario(tipo) {
  tipoActual = tipo; borradorId = tipo + '_' + Date.now();
  document.getElementById('pantalla-menu').style.display = 'none';
  document.getElementById('pantalla-form').style.display = 'block';
  const tw = document.getElementById('tabs-wrap');
  if(tipo === 'emp') {
    document.getElementById('h-titulo').textContent = 'Empaque';
    document.getElementById('h-sub').textContent = 'Informe por turno';
    tw.style.display = 'none';
    renderEmpaque();
  } else if(tipo === 'pe') {
    document.getElementById('h-titulo').textContent = 'Procesos';
    document.getElementById('h-sub').textContent = 'Informe por turno';
    tw.style.display = 'block';
    renderPE();
    renderTabs();
  } else {
    document.getElementById('h-titulo').textContent = 'Materia Prima';
    document.getElementById('h-sub').textContent = 'Informe diario';
    tw.style.display = 'none';
    renderMP();
  }
  window.scrollTo(0,0);
}

function volverMenu() {
  autoSave();
  if(window._fb && borradorId && seccionAbierta) window._fb.limpiarPresencia(borradorId, seccionAbierta);
  if(window._fb) window._fb.detener();
  seccionAbierta = '';
  document.getElementById('pantalla-form').style.display = 'none';
  document.getElementById('pantalla-menu').style.display = 'flex';
  renderBorradores();
}

function toggleBorradores() {
  const el = document.getElementById('borradores-list');
  el.style.display = el.style.display === 'block' ? 'none' : 'block';
  if(el.style.display === 'block') renderBorradores();
}

async function renderBorradores() {
  const el = document.getElementById('borradores-list');
  el.innerHTML = '<div style="text-align:center;padding:14px;color:var(--txt-s);font-size:13px">⏳ Cargando...</div>';
  if(!window._fb) { document.addEventListener('fbReady', renderBorradores, {once:true}); return; }
  const lista = await window._fb.listar();
  if(!lista.length) { el.innerHTML = '<div style="text-align:center;padding:14px;color:var(--txt-s);font-size:13px">No hay borradores guardados</div>'; return; }
  const labels = { emp:'📦 Empaque', pe:'⚙️ Procesos', mp:'🌿 Materia Prima' };
  el.innerHTML = lista.map(d => `<div class="borrador-item">
    <div onclick="cargarBorrador('${d.id}')" style="flex:1;cursor:pointer">
      <div class="borrador-nombre">${labels[d.tipo]||d.tipo} — ${d.fecha||'Sin fecha'} Turno ${d.turno||'—'}</div>
      <div class="borrador-fecha">☁️ ${d.ts ? new Date(d.ts).toLocaleString('es-CO') : '—'}</div>
    </div>
    <div style="display:flex;gap:6px">
      <button class="btn-mini" onclick="cargarBorrador('${d.id}')">Continuar</button>
      <button class="btn-mini btn-mini-r" onclick="eliminarBorrador('${d.id}',event)">Eliminar</button>
    </div>
  </div>`).join('');
}

async function cargarBorrador(id) {
  toast('⏳ Cargando...');
  const d = window._fb ? await window._fb.cargar(id) : null;
  if(!d) { toast('⚠️ No se pudo cargar','rojo'); return; }
  tipoActual = d.tipo; borradorId = id;
  document.getElementById('pantalla-menu').style.display = 'none';
  document.getElementById('pantalla-form').style.display = 'block';
  const tw = document.getElementById('tabs-wrap');
  if(d.tipo === 'emp') {
    document.getElementById('h-titulo').textContent = 'Empaque';
    document.getElementById('h-sub').textContent = 'Informe por turno';
    tw.style.display = 'none'; renderEmpaque();
  } else if(d.tipo === 'pe') {
    document.getElementById('h-titulo').textContent = 'Procesos';
    document.getElementById('h-sub').textContent = 'Informe por turno';
    tw.style.display = 'block'; renderPE(); renderTabs();
  } else {
    document.getElementById('h-titulo').textContent = 'Materia Prima';
    document.getElementById('h-sub').textContent = 'Informe diario';
    tw.style.display = 'none'; renderMP();
  }
  setTimeout(() => { restaurarDatos(d); if(d.tipo==='pe') setTimeout(renderTabs,200); }, 300);
  window.scrollTo(0,0);
  toast('✓ Borrador cargado','verde');
}

async function eliminarBorrador(id, e) {
  e.stopPropagation();
  if(!confirm('¿Eliminar este borrador?')) return;
  if(window._fb) await window._fb.eliminar(id);
  renderBorradores(); toast('Borrador eliminado');
}

/* ══════ TABS (solo PE) ══════ */
function renderTabs() {
  const el = document.getElementById('tabs-estado');
  el.innerHTML = SECCIONES_PE.map((s,i) => `<div class="tab-e${i===0?' activo':''}" id="tab-${s}" onclick="irSec('${s}')">
    <span class="edot dot-${calcEstado(s)}"></span>${LABEL_SEC[s]}<span class="tab-pres" id="tp-${s}"></span>
  </div>`).join('');
  if(borradorId && window._fb) iniciarRealtime();
}

function irSec(s) {
  document.querySelectorAll('.tab-e').forEach(t => t.classList.remove('activo'));
  document.getElementById('tab-'+s)?.classList.add('activo');
  const el = document.getElementById('sec-'+s);
  if(el) {
    const body = el.querySelector('.sec-body');
    if(body && !body.classList.contains('ab')) toggleSec(el.querySelector('.sec-header'));
    el.scrollIntoView({behavior:'smooth', block:'start'});
    marcarPresencia(s);
  }
}

function calcEstado(s) {
  const rows = document.querySelectorAll(`#sec-${s} .sino-row`);
  if(!rows.length) return estadosRemotos[s]?.estado || 'vacio';
  const filled = document.querySelectorAll(`#sec-${s} .rbtn.si, #sec-${s} .rbtn.no`).length;
  if(filled === 0) return 'vacio';
  if(filled >= rows.length) return 'completo';
  return 'parcial';
}

function actualizarTab(s) {
  const tab = document.getElementById('tab-'+s); if(!tab) return;
  const e = calcEstado(s);
  tab.querySelector('.edot').className = 'edot dot-' + e;
  if(window._fb && borradorId) window._fb.publicarEstado(borradorId, s, e);
}

/* ══════ PRESENCIA ══════ */
function iniciarRealtime() {
  window._fb.escucharEstados(borradorId, estados => {
    estadosRemotos = estados;
    SECCIONES_PE.forEach(s => actualizarTab(s));
  });
  window._fb.escucharPresencia(borradorId, presencia => {
    presenciaRemota = presencia;
    SECCIONES_PE.forEach(s => {
      const tp = document.getElementById('tp-'+s);
      if(!tp) return;
      const p = presencia[s];
      if(p && p.usuario && Date.now()-(p.ts||0) < 120000) {
        const ini = p.usuario.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
        tp.textContent = ini; tp.title = p.usuario+' editando'; tp.classList.add('visible');
      } else tp.classList.remove('visible');
      // Banner en sección abierta
      const body = document.querySelector(`#sec-${s} .sec-body`);
      if(body) {
        body.querySelector('.badge-editando')?.remove();
        if(p && p.usuario && Date.now()-(p.ts||0)<120000) {
          const b = document.createElement('div'); b.className = 'badge-editando';
          b.innerHTML = `<span class="dot-vivo"></span>${p.usuario} está editando esta sección`;
          body.insertBefore(b, body.firstChild);
        }
      }
    });
  });
}

function marcarPresencia(s) {
  if(!window._fb || !borradorId) return;
  if(seccionAbierta && seccionAbierta !== s) window._fb.limpiarPresencia(borradorId, seccionAbierta);
  seccionAbierta = s;
  window._fb.marcarPresencia(borradorId, s, 'Anónimo');
}

/* ══════ VALIDACIÓN ══════ */
function validar() {
  const err = [];
  document.querySelectorAll('.sino-row').forEach(row => {
    if(!row.querySelector('.rbtn.si,.rbtn.no')) {
      const lbl = row.closest('.pregunta')?.querySelector('.preg-label')?.textContent?.trim()||'';
      const s   = row.closest('.seccion')?.querySelector('.sec-titulo')?.textContent||'';
      err.push(`[${s}] ${lbl.slice(0,70)}`);
    }
  });
  return err;
}

function mostrarModal(err) {
  const m = document.createElement('div'); m.className = 'modal-overlay';
  m.innerHTML = `<div class="modal-box">
    <div class="modal-titulo">⚠️ ${err.length} pregunta(s) sin responder</div>
    <ul class="modal-lista">${err.map(e=>`<li>${e}</li>`).join('')}</ul>
    <button class="modal-btn" onclick="this.closest('.modal-overlay').remove()">Entendido</button>
  </div>`;
  document.body.appendChild(m);
}

function toast(msg, tipo='') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = 'toast ' + tipo;
  t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2500);
}

/* ══════════════════════════════════════════════
   FORMULARIO EMPAQUE
══════════════════════════════════════════════ */
function renderEmpaque() {
  const c = document.getElementById('form-content');
  c.innerHTML = `
  <div class="datos-card">
    <div class="dato-item"><label>Fecha</label><input type="date" class="dato-inp" data-campo="fecha" onchange="autoSave()"></div>
    <div class="dato-item"><label>Turno</label>
      <select class="dato-inp" data-campo="turno" onchange="autoSave()">
        <option>1</option><option>2</option><option>3</option>
      </select>
    </div>
  </div>

  <div class="seccion" id="sec-empaque">
    <div class="sec-header" onclick="toggleSec(this)">
      <div class="sec-icon">📦</div>
      <div class="sec-titulo">Empaque</div>
      <span class="sec-chev ab">▼</span>
    </div>
    <div class="sec-body ab">
      ${mkResp('empaque','Responsable(s) Empaque')}

      ${preg(1,'¿Se lavaron máquinas durante el turno?','emp_lavado',
        `<textarea class="rdet" data-campo="emp_lavado_cuales" placeholder="¿Qué máquinas se lavaron? Nombre y número..." oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de las máquinas lavadas</div>
         ${foto('Adjuntar foto de cada máquina lavada','Una foto por máquina')}`
      )}

      ${preg(2,'¿Hay máquinas fuera de servicio?','emp_fs',
        tbl('t-emp-fs',['Máquina','Motivo / Falla','Desde cuándo'])
      )}

      ${preg(3,'¿Salieron exportaciones durante el turno?','emp_exp',
        `${tbl('t-emp-exp',['Referencia','Lote','Destino / Cliente','Cantidad'])}
         <div class="nota-info" style="margin-top:8px">
           <strong>📌 Fotos deben incluir:</strong> producto, leyenda, peso, embalaje y sticker de la caja.
         </div>
         ${foto('Fotos de exportaciones','Producto + leyenda + peso + embalaje + sticker')}`
      )}

      ${preg(4,'¿Hay producto con más de 2 días de producción en tolvas?','emp_tolvas',
        tbl('t-emp-tolvas',['Producto / Referencia','Tolva','Fecha de producción','Días acumulados'])
      )}

      ${preg(5,'¿Salió producto no conforme durante el turno?','emp_pnc',
        `${tbl('t-emp-pnc',['Producto','Área','Causa','Cantidad'])}
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto del formato de no conforme</div>
         ${foto('Adjuntar foto del formato diligenciado','Foto obligatoria del formato')}`
      )}

      ${preg(6,'¿Salieron láminas no conformes durante el turno?','emp_laminas',
        `${tbl('t-emp-laminas',['Referencia','Tipo de no conformidad','Cantidad'])}
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto del formato y de la lámina</div>
         ${foto('Foto del formato + foto de la lámina','Adjuntar ambas fotos')}`
      )}

      ${preg(7,'¿Hubo novedades con fechas de empaque?','emp_fechas',
        `<textarea class="rdet" data-campo="emp_fechas_accion" placeholder="¿Qué se hizo? Describa la acción tomada..." oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de la novedad</div>
         ${foto('Adjuntar evidencia fotográfica','Foto de la novedad de fechas')}`
      )}

      ${preg(8,'¿Hay algún cambio o autorización de producto que no se saca habitualmente?','emp_cambios',
        `<textarea class="rdet" data-campo="emp_cambios_cual" placeholder="¿Cuál producto y quién autorizó?" oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de la novedad / autorización</div>
         ${foto('Adjuntar evidencia fotográfica','Foto del cambio o autorización')}`
      )}

      ${preg(9,'¿Se realizó liberación de sticker de alguna referencia nacional (diferente a exportación)?','emp_sticker',
        `${tbl('t-emp-sticker',['Referencia','Lote','Motivo de liberación'])}
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto del sticker liberado (referencia, lote, sticker)</div>
         ${foto('Foto del sticker','Adjuntar foto del sticker de la referencia liberada')}`
      )}

      <div class="pregunta">
        <div class="preg-label"><span class="pnum">10</span>Rayos X — Estado y productos inspeccionados</div>
        <div class="grid2" style="margin-bottom:10px">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--txt-s);margin-bottom:5px">¿RX1 se encuentra operando?</div>
            <div class="sino-row" data-key="emp_rx1_op">
              <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
              <button class="rbtn" onclick="siNo(this,'no')">No</button>
            </div>
          </div>
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--txt-s);margin-bottom:5px">¿RX2 se encuentra operando?</div>
            <div class="sino-row" data-key="emp_rx2_op">
              <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
              <button class="rbtn" onclick="siNo(this,'no')">No</button>
            </div>
          </div>
        </div>
        <div style="font-size:12px;font-weight:500;color:var(--txt-s);margin-bottom:6px">Productos inspeccionados por RX1 y RX2</div>
        ${tbl('t-emp-rx',['Equipo (RX1/RX2)','Referencia','Lote'])}
      </div>

      ${preg(11,'¿Hubo máquinas con desviaciones de peso durante el turno?','emp_peso',
        tbl('t-emp-peso',['Máquina','Referencia','Desviación registrada','Acción tomada'])
      )}

      <div class="pregunta">
        <div class="preg-label"><span class="pnum">12</span>Otras novedades del turno</div>
        <textarea class="rdet" data-campo="emp_otras" style="min-height:80px" placeholder="Describa cualquier otra novedad relevante del turno..." oninput="autoSave()"></textarea>
        <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de otras novedades</div>
        ${foto('Adjuntar fotos si aplica','Fotos de novedades adicionales')}
      </div>
    </div>
  </div>`;

  document.querySelector('[data-campo="fecha"]').valueAsDate = new Date();
}

/* ══════════════════════════════════════════════
   FORMULARIO PROCESOS
══════════════════════════════════════════════ */
function renderPE() {
  const c = document.getElementById('form-content');

  // Sección Papa genérica
  function secPapa(linea) {
    const L = linea.toUpperCase();
    return sec(linea, '🥔', `Papa — Línea ${L}`, mkResp(linea, `Responsable(s) Línea ${L}`) + `
      <div class="grid2" style="margin-bottom:12px">
        <div><div class="preg-label"><span class="pnum">1</span>Tipo de papa</div>
          <select class="rinp" data-campo="${linea}_tipo" onchange="autoSave()">
            <option value="">Seleccione...</option><option>Cachirry</option><option>Pareja</option><option>R12</option><option>Mezcla</option>
          </select></div>
        <div><div class="preg-label"><span class="pnum">2</span>T° cuarto de papa</div>
          <input class="rinp" type="text" data-campo="${linea}_temp" placeholder="°C" oninput="autoSave()"></div>
      </div>
      ${preg(3,'¿Se realizaron mezclas de papa?',linea+'_mezcla', tbl('t-'+linea+'-mezcla',['Tipos mezclados','Proporción','Observaciones']))}
      ${preg(4,'¿Se utilizó papa de guacal o de bulto?',linea+'_guacal', tbl('t-'+linea+'-guacal',['Tipo','Cantidad (kg)','Lavador activado']))}
      ${preg(5,'¿Se calibraron y limpiaron tambores?',linea+'_tambores', tbl('t-'+linea+'-tambores',['N° Tambor','Tipo de limpieza','Responsable']))}
      ${preg(6,'¿Se realizaron limpiezas de tanques?',linea+'_tanques',
        tbl('t-'+linea+'-tanques',['Tanque','Tipo de limpieza','Responsable']) +
        `<div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de limpieza de tanques (obligatorio)</div>
        ${foto('Evidencia fotográfica de cada tanque','Foto obligatoria de cada tanque limpiado')}`
      )}
      ${preg(7,'¿Se limpiaron bombos para cambio de referencia?',linea+'_bombos', tbl('t-'+linea+'-bombos',['Bombo','Referencia anterior','Referencia nueva']))}
      ${preg(8,'¿Se reprocesó papa de otro sabor?',linea+'_reproc', tbl('t-'+linea+'-reproc',['Referencia','Cantidad (kg)','Sabor original']))}
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">9</span>Tipo de aceite y presentación</div>
        <div class="grid2">
          <select class="rinp" data-campo="${linea}_aceite" onchange="autoSave()"><option value="">Seleccione...</option><option>Nuevo</option><option>Reutilizado</option></select>
          <select class="rinp" data-campo="${linea}_aceite_tipo" onchange="autoSave()"><option value="">Seleccione...</option><option>Oleína</option><option>Aceite Blend</option></select>
        </div>
      </div>
      ${preg(10,'¿Se detectó papa cruda?',linea+'_cruda', tbl('t-'+linea+'-cruda',['Cantidad (kg)','Causa','Acción tomada']))}
      ${preg(11,'¿Hubo producto no conforme?',linea+'_pnc',
        tbl('t-'+linea+'-pnc',['Descripción','Causa','Cantidad','Disposición']) +
        `<div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos PNC — Línea ${L}</div>
        ${foto('Adjuntar evidencia fotográfica','Foto del PNC')}`
      )}
      <div class="sep"></div>
      ${tbl('t-'+linea,['Referencia','% Saborización','Observaciones'],3)}
    `);
  }

  c.innerHTML = `
  <div class="datos-card">
    <div class="dato-item"><label>Fecha</label><input type="date" class="dato-inp" data-campo="fecha" onchange="autoSave()"></div>
    <div class="dato-item"><label>Turno</label>
      <select class="dato-inp" data-campo="turno" onchange="autoSave()"><option>1</option><option>2</option><option>3</option></select></div>
    <div class="dato-item"><label>Código</label>
      <input type="text" class="dato-inp" data-campo="codigo" placeholder="Ej. PR-226" oninput="autoSave()"></div>
  </div>

  ${sec('extruido','⚙️','Extruido', mkResp('extruido','Responsable(s) Extruido') + `
    ${pregTxt(1,'¿Qué extrusores trabajaron en el turno?','ext_op','Ej. Extrusor 1 y 2...')}
    ${preg(2,'¿Se realizaron limpiezas de líneas o extrusores?','ext_limp', tbl('t-ext-limp',['Extrusor / Línea','Tipo de limpieza','Responsable']))}
    ${preg(3,'¿Se agregó papa, extruido o rosquilla al proceso?','ext_adicion', tbl('t-ext-adicion',['Material','Cantidad (kg)','Motivo']))}
    ${preg(4,'¿Las densidades estuvieron fuera de los parámetros?','ext_dens', tbl('t-ext-dens',['Referencia','Densidad registrada','Parámetro','Causa']))}
    ${preg(5,'¿Las dimensiones del producto presentaron incumplimientos?','ext_dim', tbl('t-ext-dim',['Referencia','Valor registrado','Especificación','Acción']))}
    ${preg(6,'¿Se generó producto no conforme (PNC)?','ext_pnc',
      tbl('t-ext-pnc',['Referencia','Descripción','Causa','Cantidad']) +
      `<div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos PNC / incumplimientos</div>${foto('Fotos de PNC','Solo fotos de lo que no cumplió')}`
    )}
    <div class="sep"></div>
    ${tbl('t-extruido',['Referencia','Densidad','¿Cumple densidad?','¿Cumple dimensiones?','Observaciones'])}
  `)}

  ${sec('rosquilla','🔵','Rosquilla', mkResp('rosquilla','Responsable(s) Rosquilla') + `
    <div class="grid2" style="margin-bottom:12px">
      <div><div class="preg-label"><span class="pnum">1</span>Formulación utilizada</div>
        <input class="rinp" type="text" data-campo="ros_form" placeholder="Nombre o código" oninput="autoSave()"></div>
      <div><div class="preg-label"><span class="pnum">2</span>Queso utilizado</div>
        <input class="rinp" type="text" data-campo="ros_queso" placeholder="Tipo / proveedor" oninput="autoSave()"></div>
    </div>
    ${preg(3,'¿Se liberó queso durante el turno?','ros_queso_lib', tbl('t-ros-queso',['Queso liberado','Cantidad','PNC generado']))}
    ${preg(4,'¿Faltó alguna materia prima?','ros_mp', tbl('t-ros-mp',['Materia prima','Impacto en proceso','Acción tomada']))}
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">5</span>Hornos funcionales / en operación</div>
      <div class="grid2">
        <div><label style="font-size:12px;color:var(--txt-s)">Funcionales</label><input class="rinp" type="text" data-campo="ros_hornos_f" placeholder="Ej. 4" oninput="autoSave()"></div>
        <div><label style="font-size:12px;color:var(--txt-s)">En operación</label><input class="rinp" type="text" data-campo="ros_hornos_op" placeholder="Ej. 3" oninput="autoSave()"></div>
      </div>
      <textarea class="rdet" style="margin-top:8px" data-campo="ros_hornos_nov" placeholder="Novedades de hornos..." oninput="autoSave()"></textarea>
    </div>
    ${preg(6,'¿Se generó producto no conforme (PNC)?','ros_pnc', tbl('t-ros-pnc',['Referencia','Causa','Cantidad','Disposición']))}
    ${preg(7,'¿Las densidades presentaron desviaciones?','ros_dens', tbl('t-ros-dens',['Referencia','Densidad registrada','Parámetro','Causa']))}
    <div class="sep"></div>
    ${tbl('t-rosquilla',['Referencia','Cant. Batch','Corte Crudo','Peso Final','T° Amb.','T° Masa','T. Reposo','Humedad %','T° Cuarto'],2)}
    <div style="margin-top:10px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de cambios y PNC</div>
    ${foto('Solo de cambios relevantes y PNC','Adjuntar evidencia fotográfica')}
  `)}

  ${sec('tortillas','🟤','Tortillas', mkResp('tortillas','Responsable(s) Tortillas') + `
    ${preg(1,'¿Hubo incumplimientos en tiempos de reposo?','tort_reposo', tbl('t-tort-reposo',['Referencia','Tiempo real','Tiempo requerido','Motivo']))}
    ${preg(2,'¿Se generó producto no conforme (PNC)?','tort_pnc', tbl('t-tort-pnc',['Referencia','Causa','Cantidad','Disposición']))}
    ${preg(3,'¿Se garantizó la selección del PNC?','tort_sel', `<textarea class="rdet" data-campo="tort_sel_det" placeholder="Describa cómo se realizó la selección..." oninput="autoSave()"></textarea>`)}
    ${preg(4,'¿Se utilizó maíz del tanque sedimentador de finos?','tort_maiz', tbl('t-tort-maiz',['Cantidad utilizada (kg)','Observaciones'],1))}
    ${preg(5,'¿La saborización presentó desviaciones?','tort_sabor', tbl('t-tort-sabor',['Referencia','% registrado','% requerido','Acción']))}
    ${preg(6,'¿Se detectó maíz contaminado por plagas?','tort_plagas', tbl('t-tort-plagas',['Tipo de contaminación','Área afectada','Acción tomada']))}
    ${preg(7,'¿Hubo equipos en mantenimiento?','tort_mto', tbl('t-tort-mto',['Equipo','Tipo de mantenimiento','Estado al cierre']))}
    <div class="sep"></div>
    ${tbl('t-tortillas',['Referencia','Peso Crudo','Peso Horneado','T. Reposo','T. Horneado','T. Freído','% Sabor.','Responsable'])}
    <div style="margin-top:10px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de incumplimientos</div>
    ${foto('Solo de lo que salió mal','PNC, desviaciones o fallas')}
  `)}

  ${sec('trocillo','🟧','Trocillo', mkResp('trocillo','Responsable(s) Trocillo') + `
    <div class="grid2" style="margin-bottom:12px">
      <div><div class="preg-label"><span class="pnum">1</span>Tipo de aceite</div>
        <select class="rinp" data-campo="troc_aceite" onchange="autoSave()"><option value="">Seleccione...</option><option>Nuevo</option><option>Reutilizado</option><option>Mezcla</option></select></div>
      <div><div class="preg-label"><span class="pnum">2</span>¿Hubo exportación?</div>
        <div class="sino-row" data-key="troc_exp">
          <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
          <button class="rbtn" onclick="siNo(this,'no')">No</button>
        </div>
        <div class="cond-si" style="display:none">${tbl('t-troc-exp',['Referencia','Lote','Destino / Cliente'],1)}</div>
      </div>
    </div>
    ${preg(3,'¿Se realizaron reprocesos?','troc_rep', tbl('t-troc-rep',['Tipo de reproceso','Cantidad (kg)','Motivo']))}
    ${preg(4,'¿El proceso arrancó con mezcla de aceite?','troc_mezcla', `<textarea class="rdet" data-campo="troc_mezcla_det" placeholder="Describa la mezcla utilizada..." oninput="autoSave()"></textarea>`)}
    ${preg(5,'¿Las dimensiones presentaron incumplimientos?','troc_dim',
      tbl('t-troc-dim',['Variable','Valor registrado','Especificación','Acción']) +
      `<div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto si no cumple</div>${foto('Foto de dimensiones','Solo si hubo incumplimiento')}`
    )}
    ${preg(6,'¿Las densidades presentaron desviaciones?','troc_dens', tbl('t-troc-dens',['Referencia','Densidad','Parámetro','Causa']))}
    ${preg(7,'¿Hubo algún equipo con falla?','troc_falla', tbl('t-troc-falla',['Equipo','Descripción de la falla','Acción tomada']))}
    <div class="sep"></div>
    ${tbl('t-trocillo',['Referencia','Peso Crudo','Peso Freído','T. Reposo','T. Freído','Responsable'])}
    <div class="sep"></div>
    <div class="preg-label" style="margin-bottom:8px"><strong>Dimensiones antes del reposo</strong></div>
    <div class="twrap"><table class="reg" id="t-troc-antes">
      <thead><tr><th>Variable</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:600;background:var(--gris)">Largo</td>${'<td><input type="text" oninput="autoSave()"></td>'.repeat(5)}</tr>
        <tr><td style="font-weight:600;background:var(--gris)">Ancho</td>${'<td><input type="text" oninput="autoSave()"></td>'.repeat(5)}</tr>
        <tr><td style="font-weight:600;background:var(--gris)">Espesor</td>${'<td><input type="text" oninput="autoSave()"></td>'.repeat(5)}</tr>
      </tbody>
    </table></div>
    <div class="preg-label" style="margin:12px 0 8px"><strong>Dimensiones después del freído</strong></div>
    <div class="twrap"><table class="reg" id="t-troc-despues">
      <thead><tr><th>Variable</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:600;background:var(--gris)">Largo</td>${'<td><input type="text" oninput="autoSave()"></td>'.repeat(5)}</tr>
        <tr><td style="font-weight:600;background:var(--gris)">Ancho</td>${'<td><input type="text" oninput="autoSave()"></td>'.repeat(5)}</tr>
        <tr><td style="font-weight:600;background:var(--gris)">Espesor</td>${'<td><input type="text" oninput="autoSave()"></td>'.repeat(5)}</tr>
      </tbody>
    </table></div>
  `)}

  ${secPapa('daf')} ${secPapa('pc4')} ${secPapa('pc6')}

  ${sec('pellet','🔶','Pellet', mkResp('pellet','Responsable(s) Pellet') + `
    ${preg(1,'¿Se realizaron limpiezas?','pell_limp',
      `<select class="rinp" data-campo="pell_limp_tipo" style="margin-bottom:6px" onchange="autoSave()">
        <option>Profunda</option><option>Parcial</option><option>Cambio de referencia</option>
       </select>
       <textarea class="rdet" data-campo="pell_limp_det" placeholder="Describa las limpiezas..." oninput="autoSave()"></textarea>`
    )}
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">2</span>Tipo de aceite</div>
      <select class="rinp" data-campo="pell_aceite" onchange="autoSave()"><option value="">Seleccione...</option><option>Nuevo</option><option>Reutilizado</option></select>
    </div>
    ${preg(3,'¿Las temperaturas superaron los 180°C?','pell_temp', tbl('t-pell-temp',['Referencia','T° registrada','Hora','Acción tomada']))}
    ${preg(4,'¿Las densidades presentaron desviaciones?','pell_dens', tbl('t-pell-dens',['Referencia','Densidad','Parámetro','Causa']))}
    ${preg(5,'¿Se realizaron mezclas de producto?','pell_mezcla', tbl('t-pell-mezcla',['Productos mezclados','Proporción','Observaciones']))}
    ${preg(6,'¿Se realizaron reprocesos?','pell_reproc', tbl('t-pell-reproc',['Referencia','Tipo','Cantidad (kg)']))}
    ${preg(7,'¿Hay materia prima con fechas cortas?','pell_fechas', tbl('t-pell-fechas',['Materia prima','Fecha vencimiento','Cantidad']))}
    ${preg(8,'¿Se generó producto no conforme (PNC)?','pell_pnc', tbl('t-pell-pnc',['Referencia','Descripción','Causa','Disposición']))}
    ${pregTxt(9,'Acciones correctivas tomadas en el turno','pell_acc','Describa las acciones implementadas...')}
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">10</span>TPM del turno</div>
      <input class="rinp" type="text" data-campo="pell_tpm" placeholder="Registro TPM" oninput="autoSave()">
    </div>
    <div class="sep"></div>
    ${tbl('t-pellet',['Referencia','% Saborización','T° (°C)','¿Cumple T°?','Observaciones'])}
    <div style="margin-top:10px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de tanque y PNC</div>
    ${foto('Fotos de tanque y producto no conforme','Solo fotos de tanque y PNC')}
  `)}`;

  document.querySelector('[data-campo="fecha"]').valueAsDate = new Date();
}

/* ══════════════════════════════════════════════
   FORMULARIO MATERIA PRIMA
══════════════════════════════════════════════ */
function renderMP() {
  const c = document.getElementById('form-content');
  c.innerHTML = `
  <div class="datos-card">
    <div class="dato-item"><label>Fecha</label><input type="date" class="dato-inp" data-campo="fecha" onchange="autoSave()"></div>
    <div class="dato-item"><label>Código</label><input type="text" class="dato-inp" data-campo="codigo" placeholder="Ej. MP-226" oninput="autoSave()"></div>
  </div>

  ${sec('mp','🌿','Recepción de Materia Prima', mkResp('mp','Responsable(s) Materia Prima') + `
    ${preg(1,'¿Se identificaron materias primas con fechas cortas en bodega?','mp_fechas',
      tbl('t-mp-fechas',['Materia prima','Fecha de vencimiento','Cantidad disponible'])
    )}
    ${preg(2,'¿Se realizó rotación del cuarto de papa?','mp_rotacion',
      `<textarea class="rdet" data-campo="mp_rotacion_det" placeholder="Describa la rotación realizada..." oninput="autoSave()"></textarea>`
    )}
    ${preg(3,'¿Se midieron los sólidos totales?','mp_solidos',
      `<input class="rinp" type="text" data-campo="mp_solidos_val" placeholder="Valor medido (%)" oninput="autoSave()">`
    )}
    ${preg(4,'¿Compras aceptó todos los insumos recibidos?','mp_compras',
      `<textarea class="rdet" data-campo="mp_compras_det" placeholder="Si hubo rechazos, especifique cuáles y el motivo..." oninput="autoSave()"></textarea>`
    )}
    <div style="margin-top:10px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de recepciones del turno</div>
    ${foto('Una foto por cada recepción realizada','Foto obligatoria de cada recepción')}
    <div class="sep"></div>
    <div class="preg-label" style="margin-bottom:8px"><strong>Registro por proveedor</strong></div>
    ${tbl('t-mp',['Proveedor','Referencia','% Aceptación','Sólidos totales','Observaciones'],2)}
  `)}`;

  document.querySelector('[data-campo="fecha"]').valueAsDate = new Date();
}

/* ══════════════════════════════════════════════
   GENERACIÓN PDF
══════════════════════════════════════════════ */
async function generarPDF() {
  const err = validar();
  if(err.length) { mostrarModal(err); return; }
  if(!window.jspdf) { toast('Cargando PDF...'); setTimeout(generarPDF,1000); return; }
  toast('Generando PDF...');
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'p', unit:'mm', format:'a4'});
  const PW=210,PH=297,ML=14,MR=14,MT=18,MB=18,CW=PW-ML-MR;
  let y=MT, pg=1;

  const C = {
    azul:[13,45,78], azulM:[26,77,122], azulCl:[232,242,251],
    verde:[10,110,74], verdeCl:[230,245,239],
    rojo:[192,57,43], rojoCl:[253,240,239],
    gris:[245,246,248], grisM:[216,221,230],
    negro:[26,31,46], suave:[90,100,120], blanco:[255,255,255]
  };

  function check(h=8) { if(y+h > PH-MB) { pie(); doc.addPage(); pg++; y=MT; cabecera(); } }

  function cabecera() {
    doc.setFillColor(...C.azul); doc.rect(0,0,PW,11,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    const titH = tipoActual==='emp'?'Informe de Empaque':tipoActual==='pe'?'Informe de Procesos':'Informe de Materia Prima';
    doc.text('Productos Vicky S.A.S. — '+titH, ML, 7);
    doc.setFont('helvetica','normal'); doc.setFontSize(7);
    const fecha=gv('fecha'),turno=gv('turno');
    doc.text(`Fecha: ${fecha} | Turno: ${turno} | Pág. ${pg}`, PW-ML, 7, {align:'right'});
  }

  function pie() {
    doc.setFillColor(...C.grisM); doc.rect(0,PH-7,PW,7,'F');
    doc.setTextColor(...C.suave); doc.setFont('helvetica','normal'); doc.setFontSize(6.5);
    doc.text('Documento confidencial — Productos Vicky S.A.S.', PW/2, PH-2.5, {align:'center'});
  }

  function titulo(txt, nivel=1) {
    check(12);
    if(nivel===1) {
      doc.setFillColor(...C.azulM); doc.rect(ML,y,CW,8,'F');
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
      doc.text(txt.toUpperCase(), ML+3, y+5.5); y+=11;
    } else {
      doc.setFillColor(...C.azulCl); doc.rect(ML,y,CW,7,'F');
      doc.setDrawColor(...C.azulM); doc.rect(ML,y,CW,7,'S');
      doc.setTextColor(...C.azulM); doc.setFont('helvetica','bold'); doc.setFontSize(8.5);
      doc.text(txt, ML+3, y+4.8); y+=9;
    }
  }

  function campo(label, val, sino=null) {
    if(sino==='no' && !val?.trim()) {
      // Solo mostrar label + NO en una línea compacta
      check(6);
      doc.setFillColor(...C.rojoCl); doc.rect(ML,y,CW,5.5,'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C.rojo);
      doc.text(label, ML+2, y+3.8);
      doc.setFont('helvetica','bold');
      doc.text('[NO]', PW-MR-2, y+3.8, {align:'right'});
      y+=6; return;
    }
    if(!val?.trim() && !sino) return;
    check(7);
    doc.setFillColor(...C.gris); doc.rect(ML,y,CW,5.5,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...C.azulM);
    doc.text(label, ML+2, y+3.8);
    if(sino) {
      const color = sino==='si'?C.verde:C.rojo;
      const lbl = sino==='si'?'[SI]':'[NO]';
      doc.setTextColor(...color); doc.setFont('helvetica','bold');
      doc.text(lbl, PW-MR-2, y+3.8, {align:'right'});
    }
    y+=6;
    if(val?.trim() && sino!=='no') {
      const lines = doc.splitTextToSize(val, CW-5);
      const h = lines.length*4.2+3;
      check(h);
      doc.setFillColor(252,252,252); doc.rect(ML,y,CW,h,'F');
      doc.setDrawColor(...C.grisM); doc.rect(ML,y,CW,h,'S');
      doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(...C.negro);
      doc.text(lines, ML+2, y+3.2); y+=h+2;
    }
  }

  function tabla(headers, rows) {
    const valid = (rows||[]).filter(r=>r.some(v=>v?.trim()));
    if(!valid.length) return;
    check(16);
    const cw = CW/headers.length;
    doc.setFillColor(...C.azul); doc.rect(ML,y,CW,6,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(7);
    headers.forEach((h,i) => doc.text(h, ML+i*cw+1.5, y+4.2)); y+=6;
    valid.forEach((row,ri) => {
      const rh=5.5; check(rh);
      doc.setFillColor(...(ri%2===0?C.gris:C.blanco)); doc.rect(ML,y,CW,rh,'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(...C.negro);
      row.forEach((v,i) => doc.text(String(v||'').slice(0,28), ML+i*cw+1.5, y+3.8));
      y+=rh;
    });
    doc.setDrawColor(...C.azulM); doc.rect(ML,y-valid.length*5.5-6,CW,valid.length*5.5+6,'S');
    y+=3;
  }

  async function fotos(gridEl) {
    if(!gridEl) return;
    const imgs = [...gridEl.querySelectorAll('.fitem img')];
    if(!imgs.length) return;
    check(8);
    doc.setFont('helvetica','bold'); doc.setFontSize(7.5); doc.setTextColor(...C.azulM);
    doc.text('Evidencia fotografica:', ML, y+4); y+=7;
    // 2 fotos por fila, aprovechar ancho
    const gap = 4, cols = 2;
    const fw = (CW - gap*(cols-1)) / cols;
    let col = 0, rowY = y, rowH = 0;
    for(const img of imgs) {
      const nw = img.naturalWidth||800, nh = img.naturalHeight||600;
      const ratio = nw/nh;
      let fh = fw/ratio;
      if(fh > 85) { fh = 85; }
      const capH = img.nextElementSibling?.value ? 8 : 0;
      const totalH = fh + capH;
      if(col === 0) { check(totalH+4); rowY = y; rowH = totalH; }
      rowH = Math.max(rowH, totalH);
      const x = ML + col*(fw+gap);
      try {
        const fmt = img.src.startsWith('data:image/png')?'PNG':'JPEG';
        doc.addImage(img.src,fmt,x,rowY,fw,fh,'','MEDIUM');
        doc.setDrawColor(...C.grisM); doc.rect(x,rowY,fw,fh,'S');
        const cap = img.nextElementSibling?.value||'';
        if(cap) {
          doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...C.suave);
          doc.text(cap, x+fw/2, rowY+fh+4, {align:'center', maxWidth:fw});
        }
      } catch(e){}
      col++;
      if(col >= cols) { col=0; y = rowY+rowH+4; rowH=0; }
    }
    if(col > 0) y = rowY+rowH+4;
    y+=2;
  }

  function gv(k){ return document.querySelector(`[data-campo="${k}"]`)?.value||''; }
  function gsino(k){ const r=document.querySelector(`.sino-row[data-key="${k}"]`); const a=r?.querySelector('.rbtn.si,.rbtn.no'); return a?(a.classList.contains('si')?'si':'no'):null; }
  function gtbl(id){ const t=document.getElementById(id); if(!t) return []; return [...t.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('input,select')].map(el=>el.value)); }
  function gfgrid(secId, sinoKey){ return [...document.querySelectorAll('.fgrid')].find(g=>g.closest(`#sec-${secId}`)&&(!sinoKey||g.closest(`.pregunta`)?.querySelector(`.sino-row[data-key="${sinoKey}"]`))); }

  // ── PORTADA COMPACTA (no ocupa hoja completa) ──
  // Calcular semana del año y día de la semana
  const fechaStr = gv('fecha');
  const fechaObj = fechaStr ? new Date(fechaStr+'T12:00:00') : new Date();
  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const numDiaSemana = ['7','1','2','3','4','5','6']; // Lunes=1...Domingo=7
  const diaNom = diasSemana[fechaObj.getDay()];
  const diaNum = numDiaSemana[fechaObj.getDay()];
  // Semana ISO del año
  const d = new Date(Date.UTC(fechaObj.getFullYear(), fechaObj.getMonth(), fechaObj.getDate()));
  d.setUTCDate(d.getUTCDate()+4-(d.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const semana = Math.ceil((((d-yearStart)/86400000)+1)/7);

  const tit = tipoActual==='emp'?'INFORME DE EMPAQUE':tipoActual==='pe'?'INFORME DE PROCESOS':'INFORME DE MATERIA PRIMA';
  const responsables = tipoActual==='emp'?getResp('empaque').join(', '):tipoActual==='pe'?getResp('extruido').join(', '):getResp('mp').join(', ');

  // Banner título
  doc.setFillColor(...C.azul); doc.rect(0,0,PW,18,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(13);
  doc.text(tit, PW/2, 8, {align:'center'});
  doc.setFontSize(8); doc.setFont('helvetica','normal');
  doc.text('PRODUCTOS VICKY S.A.S.', PW/2, 14, {align:'center'});

  // Bloque de datos en 2 columnas lado a lado
  const bY = 21, bH = 22, col1W = CW*0.5, col2W = CW*0.5;
  doc.setFillColor(...C.azulCl); doc.rect(ML, bY, CW, bH,'F');
  doc.setDrawColor(...C.azulM); doc.rect(ML, bY, CW, bH,'S');
  // Línea divisoria vertical
  doc.setDrawColor(...C.azulM); doc.line(ML+col1W, bY, ML+col1W, bY+bH);

  const col1 = [
    ['Responsable:', responsables||'—'],
    ['Turno:', gv('turno')||'—'],
  ];
  const col2 = [
    ['Fecha:', fechaStr||'—'],
    ['Semana:', `Semana ${semana} del año`],
    ['Día:', `${diaNom} (${diaNum})`],
  ];

  doc.setFontSize(7.5);
  col1.forEach(([l,v],i) => {
    doc.setFont('helvetica','bold'); doc.setTextColor(...C.azulM);
    doc.text(l, ML+2, bY+5+i*7);
    doc.setFont('helvetica','normal'); doc.setTextColor(...C.negro);
    const vt = doc.splitTextToSize(v, col1W-20); 
    doc.text(vt[0]||v, ML+22, bY+5+i*7);
  });
  col2.forEach(([l,v],i) => {
    doc.setFont('helvetica','bold'); doc.setTextColor(...C.azulM);
    doc.text(l, ML+col1W+3, bY+5+i*6);
    doc.setFont('helvetica','normal'); doc.setTextColor(...C.negro);
    doc.text(v, ML+col1W+22, bY+5+i*6);
  });

  y = bY + bH + 6;
  pie();

  if(tipoActual==='emp') {
    titulo('Empaque');
    campo('Responsables', getResp('empaque').join(', ')||'—');
    campo('Máquinas lavadas', gv('emp_lavado_cuales'), gsino('emp_lavado'));
    await fotos(gfgrid('empaque','emp_lavado'));
    titulo('Máquinas fuera de servicio',2); if(gsino('emp_fs')==='si') tabla(['Máquina','Motivo','Desde cuándo'],gtbl('t-emp-fs')); else campo('Máquinas fuera de servicio','',gsino('emp_fs'));
    titulo('Exportaciones',2); if(gsino('emp_exp')==='si'){ tabla(['Referencia','Lote','Destino','Cantidad'],gtbl('t-emp-exp')); await fotos(gfgrid('empaque','emp_exp')); } else campo('Exportaciones','',gsino('emp_exp'));
    titulo('Producto en tolvas >2 días',2); if(gsino('emp_tolvas')==='si') tabla(['Producto','Tolva','Fecha producción','Días'],gtbl('t-emp-tolvas')); else campo('Producto en tolvas','',gsino('emp_tolvas'));
    titulo('Producto no conforme (PNC)',2); if(gsino('emp_pnc')==='si'){ tabla(['Producto','Área','Causa','Cantidad'],gtbl('t-emp-pnc')); await fotos(gfgrid('empaque','emp_pnc')); } else campo('PNC','',gsino('emp_pnc'));
    titulo('Láminas no conformes',2); if(gsino('emp_laminas')==='si'){ tabla(['Referencia','Tipo de NC','Cantidad'],gtbl('t-emp-laminas')); await fotos(gfgrid('empaque','emp_laminas')); } else campo('Láminas NC','',gsino('emp_laminas'));
    campo('Novedades fechas de empaque — Acción tomada', gv('emp_fechas_accion'), gsino('emp_fechas'));
    if(gsino('emp_fechas')==='si') await fotos(gfgrid('empaque','emp_fechas'));
    campo('Cambio / Autorización especial', gv('emp_cambios_cual'), gsino('emp_cambios'));
    if(gsino('emp_cambios')==='si') await fotos(gfgrid('empaque','emp_cambios'));
    titulo('Liberación de sticker',2);
    if(gsino('emp_sticker')==='si'){
      tabla(['Referencia','Lote','Motivo'],gtbl('t-emp-sticker'));
      await fotos(gfgrid('empaque','emp_sticker'));
    } else campo('Liberación sticker','',gsino('emp_sticker'));
    titulo('Rayos X — RX1 y RX2',2);
    campo('RX1 operando', '', gsino('emp_rx1_op'));
    campo('RX2 operando', '', gsino('emp_rx2_op'));
    tabla(['Equipo','Referencia','Lote'],gtbl('t-emp-rx'));
    titulo('Desviaciones de peso',2); if(gsino('emp_peso')==='si') tabla(['Máquina','Referencia','Desviación','Acción'],gtbl('t-emp-peso')); else campo('Desviaciones de peso','',gsino('emp_peso'));
    const otras = gv('emp_otras'); if(otras){ titulo('Otras novedades',2); campo('Novedades',otras); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest('.pregunta [data-campo="emp_otras"]')?.closest('.pregunta')===g.closest('.pregunta'))); }

  } else if(tipoActual==='pe') {
    const secs = {
      extruido: async ()=>{ titulo('1. Extruido'); campo('Responsables',getResp('extruido').join(', ')||'—'); campo('Extrusores operando',gv('ext_op')); campo('Limpiezas de líneas','',gsino('ext_limp')); if(gsino('ext_limp')==='si') tabla(['Extrusor','Tipo','Responsable'],gtbl('t-ext-limp')); campo('Adición al proceso','',gsino('ext_adicion')); if(gsino('ext_adicion')==='si') tabla(['Material','Cantidad','Motivo'],gtbl('t-ext-adicion')); campo('Densidades fuera de parámetros','',gsino('ext_dens')); if(gsino('ext_dens')==='si') tabla(['Referencia','Densidad','Parámetro','Causa'],gtbl('t-ext-dens')); campo('Incumplimientos de dimensiones','',gsino('ext_dim')); if(gsino('ext_dim')==='si') tabla(['Referencia','Valor','Especificación','Acción'],gtbl('t-ext-dim')); campo('PNC generado','',gsino('ext_pnc')); if(gsino('ext_pnc')==='si'){ tabla(['Referencia','Descripción','Causa','Cantidad'],gtbl('t-ext-pnc')); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest('#sec-extruido'))); } titulo('Registro extruido',2); tabla(['Referencia','Densidad','¿Cumple D?','¿Cumple Dim?','Obs'],gtbl('t-extruido')); },
      rosquilla: async ()=>{ titulo('2. Rosquilla'); campo('Responsables',getResp('rosquilla').join(', ')||'—'); campo('Formulación',gv('ros_form')); campo('Queso',gv('ros_queso')); campo('Liberación de queso','',gsino('ros_queso_lib')); if(gsino('ros_queso_lib')==='si') tabla(['Queso','Cantidad','PNC'],gtbl('t-ros-queso')); campo('Falta de MP','',gsino('ros_mp')); if(gsino('ros_mp')==='si') tabla(['MP','Impacto','Acción'],gtbl('t-ros-mp')); campo('Hornos funcionales / operando',gv('ros_hornos_f')+' / '+gv('ros_hornos_op')); campo('Novedades hornos',gv('ros_hornos_nov')); campo('PNC','',gsino('ros_pnc')); if(gsino('ros_pnc')==='si') tabla(['Referencia','Causa','Cantidad','Disposición'],gtbl('t-ros-pnc')); campo('Desviaciones de densidad','',gsino('ros_dens')); if(gsino('ros_dens')==='si') tabla(['Referencia','Densidad','Parámetro','Causa'],gtbl('t-ros-dens')); titulo('Parámetros rosquilla',2); tabla(['Referencia','Batch','C.Crudo','P.Final','T°Amb','T°Masa','T.Rep','Hum%','T°Cuarto'],gtbl('t-rosquilla')); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest('#sec-rosquilla'))); },
      tortillas: async ()=>{ titulo('3. Tortillas'); campo('Responsables',getResp('tortillas').join(', ')||'—'); campo('Incumplimientos reposo','',gsino('tort_reposo')); if(gsino('tort_reposo')==='si') tabla(['Referencia','T.Real','T.Req','Motivo'],gtbl('t-tort-reposo')); campo('PNC','',gsino('tort_pnc')); if(gsino('tort_pnc')==='si') tabla(['Referencia','Causa','Cantidad','Disposición'],gtbl('t-tort-pnc')); campo('Selección PNC',gv('tort_sel_det'),gsino('tort_sel')); campo('Maíz sedimentador','',gsino('tort_maiz')); if(gsino('tort_maiz')==='si') tabla(['Cantidad','Obs'],gtbl('t-tort-maiz')); campo('Desviaciones saborización','',gsino('tort_sabor')); if(gsino('tort_sabor')==='si') tabla(['Ref','%Reg','%Req','Acción'],gtbl('t-tort-sabor')); campo('Plagas en maíz','',gsino('tort_plagas')); if(gsino('tort_plagas')==='si') tabla(['Tipo','Área','Acción'],gtbl('t-tort-plagas')); campo('Equipos en mantenimiento','',gsino('tort_mto')); if(gsino('tort_mto')==='si') tabla(['Equipo','Tipo','Estado cierre'],gtbl('t-tort-mto')); titulo('Parámetros tortillas',2); tabla(['Referencia','P.Crudo','P.Horn','T.Rep','T.Horn','T.Freid','%Sab','Resp'],gtbl('t-tortillas')); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest('#sec-tortillas'))); },
      trocillo: async ()=>{ titulo('4. Trocillo'); campo('Responsables',getResp('trocillo').join(', ')||'—'); campo('Tipo de aceite',gv('troc_aceite')); campo('Exportación en turno','',gsino('troc_exp')); if(gsino('troc_exp')==='si') tabla(['Referencia','Lote','Destino'],gtbl('t-troc-exp')); campo('Reprocesos','',gsino('troc_rep')); if(gsino('troc_rep')==='si') tabla(['Tipo','Cantidad','Motivo'],gtbl('t-troc-rep')); campo('Mezcla de aceite',gv('troc_mezcla_det'),gsino('troc_mezcla')); campo('Incumplimientos dimensiones','',gsino('troc_dim')); if(gsino('troc_dim')==='si'){ tabla(['Variable','Valor','Esp','Acción'],gtbl('t-troc-dim')); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest('#sec-trocillo'))); } campo('Desviaciones densidad','',gsino('troc_dens')); if(gsino('troc_dens')==='si') tabla(['Ref','Densidad','Parámetro','Causa'],gtbl('t-troc-dens')); campo('Equipos con falla','',gsino('troc_falla')); if(gsino('troc_falla')==='si') tabla(['Equipo','Falla','Acción'],gtbl('t-troc-falla')); titulo('Parámetros trocillo',2); tabla(['Referencia','P.Crudo','P.Freído','T.Reposo','T.Freído','Responsable'],gtbl('t-trocillo')); titulo('Dimensiones antes reposo',2); tabla(['Variable','M1','M2','M3','M4','M5'],gtbl('t-troc-antes')); titulo('Dimensiones después freído',2); tabla(['Variable','M1','M2','M3','M4','M5'],gtbl('t-troc-despues')); },
    };
    for(const fn of Object.values(secs)) { doc.addPage(); pg++; y=MT; cabecera(); await fn(); }

    for(const linea of ['daf','pc4','pc6']) {
      doc.addPage(); pg++; y=MT; cabecera();
      const L = linea.toUpperCase();
      titulo(`Papa — Línea ${L}`);
      campo('Responsables', getResp(linea).join(', ')||'—');
      campo('Tipo de papa', gv(linea+'_tipo')); campo('T° cuarto', gv(linea+'_temp')+' °C');
      campo('Mezclas de papa','',gsino(linea+'_mezcla')); if(gsino(linea+'_mezcla')==='si') tabla(['Tipos','Proporción','Obs'],gtbl('t-'+linea+'-mezcla'));
      campo('Papa de guacal / bulto','',gsino(linea+'_guacal')); if(gsino(linea+'_guacal')==='si') tabla(['Tipo','Cantidad','Lavador'],gtbl('t-'+linea+'-guacal'));
      campo('Calibración tambores','',gsino(linea+'_tambores')); if(gsino(linea+'_tambores')==='si') tabla(['N° Tambor','Limpieza','Resp'],gtbl('t-'+linea+'-tambores'));
      campo('Limpiezas de tanques','',gsino(linea+'_tanques')); if(gsino(linea+'_tanques')==='si'){ tabla(['Tanque','Tipo','Resp'],gtbl('t-'+linea+'-tanques')); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest(`#sec-${linea}`))); }
      campo('Limpiezas bombos','',gsino(linea+'_bombos')); if(gsino(linea+'_bombos')==='si') tabla(['Bombo','Ref anterior','Ref nueva'],gtbl('t-'+linea+'-bombos'));
      campo('Reproceso papa otro sabor','',gsino(linea+'_reproc')); if(gsino(linea+'_reproc')==='si') tabla(['Referencia','Cantidad','Sabor'],gtbl('t-'+linea+'-reproc'));
      campo('Tipo de aceite', gv(linea+'_aceite')+' / '+gv(linea+'_aceite_tipo'));
      campo('Papa cruda detectada','',gsino(linea+'_cruda')); if(gsino(linea+'_cruda')==='si') tabla(['Cantidad','Causa','Acción'],gtbl('t-'+linea+'-cruda'));
      campo('PNC','',gsino(linea+'_pnc')); if(gsino(linea+'_pnc')==='si'){ tabla(['Descripción','Causa','Cantidad','Disposición'],gtbl('t-'+linea+'-pnc')); await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest(`#sec-${linea}`) && g.closest('.pregunta')?.querySelector(`.sino-row[data-key="${linea}_pnc"]`))); }
      titulo(`Registro referencias — Línea ${L}`,2); tabla(['Referencia','% Saborización','Observaciones'],gtbl('t-'+linea));
    }

    doc.addPage(); pg++; y=MT; cabecera();
    titulo('9. Pellet');
    campo('Responsables', getResp('pellet').join(', ')||'—');
    campo('Tipo de aceite', gv('pell_aceite')); campo('Tipo de limpieza', gv('pell_limp_tipo')); campo('Detalle limpiezas', gv('pell_limp_det'));
    campo('Temp. superaron 180°C','',gsino('pell_temp')); if(gsino('pell_temp')==='si') tabla(['Referencia','T°','Hora','Acción'],gtbl('t-pell-temp'));
    campo('Desviaciones densidad','',gsino('pell_dens')); if(gsino('pell_dens')==='si') tabla(['Referencia','Densidad','Parámetro','Causa'],gtbl('t-pell-dens'));
    campo('Mezclas de producto','',gsino('pell_mezcla')); if(gsino('pell_mezcla')==='si') tabla(['Productos','Proporción','Obs'],gtbl('t-pell-mezcla'));
    campo('Reprocesos','',gsino('pell_reproc')); if(gsino('pell_reproc')==='si') tabla(['Referencia','Tipo','Cantidad'],gtbl('t-pell-reproc'));
    campo('MP fechas cortas','',gsino('pell_fechas')); if(gsino('pell_fechas')==='si') tabla(['MP','Fecha Venc.','Cantidad'],gtbl('t-pell-fechas'));
    campo('PNC','',gsino('pell_pnc')); if(gsino('pell_pnc')==='si') tabla(['Referencia','Descripción','Causa','Disposición'],gtbl('t-pell-pnc'));
    campo('Acciones correctivas', gv('pell_acc')); campo('TPM', gv('pell_tpm'));
    titulo('Registro referencias pellet',2); tabla(['Referencia','% Sabor.','T° (°C)','¿Cumple T°?','Obs'],gtbl('t-pellet'));
    await fotos([...document.querySelectorAll('.fgrid')].find(g=>g.closest('#sec-pellet')));

  } else {
    titulo('Recepción de Materia Prima');
    campo('Responsables', getResp('mp').join(', ')||'—');
    campo('MP con fechas cortas','',gsino('mp_fechas')); if(gsino('mp_fechas')==='si') tabla(['Materia prima','Fecha Venc.','Cantidad'],gtbl('t-mp-fechas'));
    campo('Rotación cuarto de papa',gv('mp_rotacion_det'),gsino('mp_rotacion'));
    campo('Sólidos totales',gv('mp_solidos_val'),gsino('mp_solidos'));
    campo('Aceptación por compras',gv('mp_compras_det'),gsino('mp_compras'));
    await fotos(document.querySelectorAll('.fgrid')[0]);
    titulo('Registro por proveedor',2); tabla(['Proveedor','Referencia','% Aceptación','Sólidos','Obs'],gtbl('t-mp'));
  }

  pie();
  const fn = `Vicky_${tipoActual==='emp'?'Empaque':tipoActual==='pe'?'Procesos':'MateriaPrima'}_${gv('fecha')||'fecha'}_T${gv('turno')||'0'}.pdf`;
  doc.save(fn);
  toast('✓ PDF generado', 'verde');
}

/* ══════ INIT ══════ */
if(window._fbReady) renderBorradores();
else document.addEventListener('fbReady', renderBorradores, {once:true});
