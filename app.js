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
  pellet: PERSONAS, mp: PERSONAS,
  pe_general: PERSONAS,
  emp_general: PERSONAS,
  papa_general: PERSONAS
};

const SECCIONES_PE = ['extruido','rosquilla','tortillas','trocillo','papa','pellet'];
const LABEL_SEC = {
  extruido:'Extruido', rosquilla:'Rosquilla', tortillas:'Tortillas',
  trocillo:'Trocillo', daf:'Papa DAF', pc4:'Papa PC4', pc6:'Papa PC6', pellet:'Pellet'
};

/* ══════ ESTADO ══════ */
let tipoActual = '';
let borradorId = '';
let autoTimer  = null;
let createdAt  = 0; // set once on form open, never updated
let estadoActual = 'construccion'; // 'construccion' | 'finalizado'
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

function tblTolvas(id, rows = 2) {
  // Special table: fecha de produccion auto-calculates dias almacenados
  const ths = ['Producto / Referencia','Tolva','Fecha de producción','Días almacenados'].map(h=>`<th>${h}</th>`).join('');
  const rowHtml = Array.from({length: rows}, (_, ri) => `<tr>
    <td><input type="text" oninput="autoSave()"></td>
    <td><input type="text" oninput="autoSave()"></td>
    <td><input type="date" oninput="calcDiasTolva(this)" style="width:100%;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;padding:4px"></td>
    <td><input type="text" readonly style="width:100%;border:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:12px;padding:4px;color:var(--rojo);font-weight:600"></td>
  </tr>`).join('');
  return `<div class="twrap"><table class="reg" id="${id}">
    <thead><tr>${ths}</tr></thead><tbody>${rowHtml}</tbody>
  </table></div>
  <button class="btn-add" onclick="addRowTolvas('${id}')">+ Agregar fila</button>`;
}

function calcDiasTolva(fechaInp) {
  const tr = fechaInp.closest('tr');
  const diasInp = tr.querySelectorAll('input')[3];
  if(!diasInp) return;
  if(!fechaInp.value) { diasInp.value = ''; return; }
  const prod = new Date(fechaInp.value + 'T12:00:00');
  const hoy  = new Date();
  hoy.setHours(12,0,0,0);
  const dias = Math.round((hoy - prod) / (1000*60*60*24));
  diasInp.value = dias >= 0 ? dias + (dias === 1 ? ' día' : ' días') : '—';
  diasInp.style.color = dias >= 2 ? 'var(--rojo)' : 'var(--verde)';
  autoSave();
}

function addRowTolvas(id) {
  const tb = document.getElementById(id)?.querySelector('tbody');
  if(!tb) return;
  const tr = document.createElement('tr');
  // col 0: texto
  const td0=document.createElement('td'); const i0=document.createElement('input'); i0.type='text'; i0.addEventListener('input',autoSave); td0.appendChild(i0); tr.appendChild(td0);
  // col 1: texto
  const td1=document.createElement('td'); const i1=document.createElement('input'); i1.type='text'; i1.addEventListener('input',autoSave); td1.appendChild(i1); tr.appendChild(td1);
  // col 2: date
  const td2=document.createElement('td'); const i2=document.createElement('input'); i2.type='date';
  Object.assign(i2.style,{width:'100%',border:'none',background:'transparent',fontFamily:"'DM Sans',sans-serif",fontSize:'12px',padding:'4px'});
  i2.addEventListener('input',()=>calcDiasTolva(i2)); td2.appendChild(i2); tr.appendChild(td2);
  // col 3: readonly días
  const td3=document.createElement('td'); const i3=document.createElement('input'); i3.type='text'; i3.readOnly=true;
  Object.assign(i3.style,{width:'100%',border:'none',background:'transparent',fontFamily:"'DM Sans',sans-serif",fontSize:'12px',padding:'4px',fontWeight:'600'});
  td3.appendChild(i3); tr.appendChild(td3);
  tb.appendChild(tr);
}

function foto(labelBtn, sub, fid='') {
  const fidAttr = fid ? ` data-fid="${fid}"` : '';
  return `<div class="fzona" onclick="this.querySelector('input').click()">
    <input type="file" accept="image/*" multiple onchange="agregarFotos(this)">
    <div>📷 ${labelBtn}</div>
    <div class="fzona-txt">${sub}</div>
  </div><div class="fgrid"${fidAttr}></div>`;
}

// Pregunta Si/No con bloque condicional
function preg(num, txt, key, condSi = '', condNo = '') {
  return `<div class="pregunta" id="preg-${key}">
    <div class="preg-label"><span class="pnum">${num}</span>${txt}</div>
    <div class="sino-row" data-key="${key}">
      <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
      <button class="rbtn" onclick="siNo(this,'no')">No</button>
    </div>
    ${condSi ? `<div class="cond-si" data-for="${key}" style="display:none">${condSi}</div>` : ''}
    ${condNo ? `<div class="cond-no" data-for="${key}" style="display:none">${condNo}</div>` : ''}
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
  const row = btn.closest('.sino-row');
  row.querySelectorAll('.rbtn').forEach(b => b.classList.remove('si','no'));
  btn.classList.add(val);
  const key = row.dataset.key;
  // Find EXACT cond blocks using data-for attribute
  const pregEl = document.getElementById('preg-' + key) || row.closest('.pregunta');
  if(pregEl) {
    const cs = pregEl.querySelector(`.cond-si[data-for="${key}"]`);
    const cn = pregEl.querySelector(`.cond-no[data-for="${key}"]`);
    if(cs) cs.style.display = val === 'si' ? 'block' : 'none';
    if(cn) cn.style.display = val === 'no' ? 'block' : 'none';
    // Handle direct textarea/input disable
    const det = pregEl.querySelector(':scope > textarea.rdet, :scope > input.rinp');
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
      del.onclick = () => { item.remove(); autoSaveFoto(); };
      const cap  = document.createElement('input'); cap.type = 'text'; cap.className = 'fcap-inp';
      cap.placeholder = 'Descripción...';
      cap.addEventListener('input', autoSave);
      item.appendChild(img); item.appendChild(del); item.appendChild(cap);
      grid.appendChild(item);
      autoSaveFoto();
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
// Single floating dropdown portal — appended to body, never clipped
let _respPortal = null;
function toggleRespMenu(menuId) {
  // Close if same menu clicked twice
  if(_respPortal && _respPortal.dataset.src === menuId) {
    _respPortal.remove(); _respPortal = null; return;
  }
  // Remove previous portal
  if(_respPortal) { _respPortal.remove(); _respPortal = null; }

  const menu = document.getElementById(menuId);
  if(!menu) return;
  const btn = menu.previousElementSibling;
  if(!btn) return;

  // Clone menu items into a portal div attached to body
  const portal = document.createElement('div');
  portal.className = 'resp-menu show';
  portal.dataset.src = menuId;
  portal.innerHTML = menu.innerHTML;

  // Position
  const r = btn.getBoundingClientRect();
  portal.style.top  = (r.bottom + window.scrollY + 3) + 'px';
  portal.style.left = r.left + 'px';
  portal.style.position = 'absolute';
  portal.style.zIndex   = '9999';
  portal.style.minWidth = Math.max(r.width, 220) + 'px';

  // Wire up clicks to original handlers
  portal.querySelectorAll('.resp-menu-item').forEach((item, i) => {
    const orig = menu.querySelectorAll('.resp-menu-item')[i];
    if(orig) item.onclick = orig.onclick;
  });

  document.body.appendChild(portal);
  _respPortal = portal;
}

// Close portal on outside click
document.addEventListener('click', e => {
  if(_respPortal && !e.target.closest('.resp-add') && !e.target.closest('[data-src]')) {
    _respPortal.remove(); _respPortal = null;
  }
});
// resp-menu click-outside handled in toggleRespMenu

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
  if(window._respPortal) { window._respPortal.remove(); window._respPortal = null; }
  // sync _respPortal reference
  if(typeof _respPortal !== 'undefined' && _respPortal) { _respPortal.remove(); _respPortal = null; }
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
  autoTimer = setTimeout(guardarNube, 800);
}

// Guardado inmediato para fotos (sin delay)
function autoSaveFoto() {
  clearTimeout(autoTimer);
  document.getElementById('autosave-lbl').textContent = '☁️ Guardando...';
  autoTimer = setTimeout(guardarNube, 300);
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
  const d = { tipo: tipoActual, createdAt: createdAt || Date.now(), estado: estadoActual || 'construccion' };
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
  // Fotos — usar data-fid semántico; asignar posicional solo si no tiene fid
  const fotos = {};
  document.querySelectorAll('.fgrid').forEach((grid, i) => {
    if(!grid.dataset.fid) grid.dataset.fid = 'fg_pos_' + i;
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
    // Temporarily make all hidden cond-si/cond-no visible to allow fgrid matching
    const hiddenConds = [...document.querySelectorAll('.cond-si[style*="none"],.cond-no[style*="none"]')];
    hiddenConds.forEach(el => el.setAttribute('data-was-hidden','1'));
    // hiddenConds.forEach(el => el.style.display='block'); // not needed, fgrids are in DOM even when hidden

    document.querySelectorAll('.fgrid').forEach((grid, i) => {
      if(!grid.dataset.fid) grid.dataset.fid = 'fg_pos_' + i;
      const items = d._fotos[grid.dataset.fid];
      if(!items?.length) return;
      grid.innerHTML = '';
      items.forEach(f => {
        if(!f.src) return;
        const item = document.createElement('div'); item.className = 'fitem';
        const img = document.createElement('img'); img.src = f.src; img.className = 'fthumb';
        img.onclick = () => verFoto(img.src);
        const del = document.createElement('button'); del.className = 'fdel'; del.textContent = '×';
        del.onclick = () => { item.remove(); autoSaveFoto(); };
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
      const isTolvas = tid === 't-emp-tolvas';
      // Ensure enough rows
      while(tb.rows.length < filas.length) {
        if(isTolvas) addRowTolvas(tid);
        else addRow(tid, cols);
      }
      [...tb.rows].forEach((tr, ri) => {
        if(!filas[ri]) return;
        [...tr.querySelectorAll('input,select')].forEach((el, ci) => {
          if(filas[ri][ci] !== undefined) el.value = filas[ri][ci];
        });
        // Recalculate days for tolvas table
        if(isTolvas) {
          const dateInp = tr.querySelectorAll('input')[2];
          if(dateInp) calcDiasTolva(dateInp);
        }
      });
    });
  }
}

/* ══════ MENÚ / NAVEGACIÓN ══════ */
async function abrirFormulario(tipo) {
  // Check for existing active drafts of this type
  if(window._fb) {
    const lista = await window._fb.listar();
    const LIMITE_MS = 12 * 60 * 60 * 1000;
    const ahora = Date.now();
    const vigentes = lista.filter(d => {
      const tc = d.createdAt || d.ts || 0;
      return d.tipo === tipo && (!tc || (ahora - tc) <= LIMITE_MS);
    });
    if(vigentes.length > 0) {
      const d = vigentes[0]; // most recent
      const tc = d.createdAt || d.ts || ahora;
      const hace = Math.round((ahora - tc) / 60000);
      const haceStr = hace < 60 ? `hace ${hace} min` : `hace ${Math.floor(hace/60)}h ${hace%60}m`;
      const labels = { emp:'Empaque', pe:'Procesos', mp:'Materia Prima' };
      const elegido = await preguntarBorrador(
        labels[tipo],
        d.fecha || '—',
        d.turno  || '—',
        haceStr
      );
      if(elegido === 'continuar') {
        cargarBorrador(d.id);
        return;
      }
      // 'nuevo': fall through to create fresh form
    }
  }
  _abrirFormularioNuevo(tipo);
}

function _abrirFormularioNuevo(tipo) {
  tipoActual = tipo; borradorId = tipo + '_' + Date.now(); createdAt = Date.now(); estadoActual = 'construccion';
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

function preguntarBorrador(tipoLabel, fecha, turno, haceStr) {
  return new Promise(resolve => {
    const m = document.createElement('div'); m.className = 'modal-overlay';
    m.innerHTML = `<div class="modal-box" style="max-width:440px">
      <div class="modal-titulo" style="font-size:16px;margin-bottom:14px">📋 Hay un borrador guardado</div>
      <div style="background:var(--azul-cl);border-radius:var(--r);padding:12px 14px;margin-bottom:16px;font-size:13px;line-height:1.7">
        <strong>Tipo:</strong> ${tipoLabel}<br>
        <strong>Fecha:</strong> ${fecha} &nbsp;|&nbsp; <strong>Turno:</strong> ${turno}<br>
        <strong>Guardado:</strong> ${haceStr}
      </div>
      <p style="font-size:13px;color:var(--txt-s);margin-bottom:16px">¿Desea continuar con este borrador o crear un informe nuevo?</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="modal-btn" style="flex:1;background:var(--azul)" onclick="this.closest('.modal-overlay').remove(); window._pregResolve('continuar')">
          Continuar borrador
        </button>
        <button class="modal-btn" style="flex:1;background:var(--verde)" onclick="this.closest('.modal-overlay').remove(); window._pregResolve('nuevo')">
          Crear nuevo
        </button>
      </div>
    </div>`;
    window._pregResolve = resolve;
    document.body.appendChild(m);
  });
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
  const LIMITE_MS = 12 * 60 * 60 * 1000; // 12 horas
  const ahora = Date.now();
  // Auto-eliminar borradores de más de 12 horas desde CREACIÓN
  for(const d of lista) {
    const tCreacion = d.createdAt || d.ts || 0;
    if(tCreacion && (ahora - tCreacion) > LIMITE_MS) {
      await window._fb.eliminar(d.id);
    }
  }
  const vigentes = lista.filter(d => { const tc = d.createdAt || d.ts || 0; return !tc || (ahora - tc) <= LIMITE_MS; });
  if(!vigentes.length) {
    el.innerHTML = '<div style="text-align:center;padding:14px;color:var(--txt-s);font-size:13px">No hay borradores guardados</div>';
    return;
  }
  el.innerHTML = vigentes.map(d => {
    const tCreacion = d.createdAt || d.ts || ahora;
    const msRestantes = LIMITE_MS - (ahora - tCreacion);
    const hRestantes = Math.max(0, Math.floor(msRestantes / 3600000));
    const mRestantes = Math.max(0, Math.floor((msRestantes % 3600000) / 60000));
    const colorTiempo = hRestantes < 2 ? 'var(--rojo)' : hRestantes < 4 ? 'var(--naranja)' : 'var(--txt-s)';
    return `<div class="borrador-item">
      <div onclick="cargarBorrador('${d.id}')" style="flex:1;cursor:pointer">
        <div class="borrador-nombre">${labels[d.tipo]||d.tipo} — ${d.fecha||'Sin fecha'} Turno ${d.turno||'—'}</div>
        <div class="borrador-fecha">☁️ ${d.ts ? new Date(d.ts).toLocaleString('es-CO') : '—'} &nbsp;
          <span style="color:${colorTiempo};font-weight:500">⏱ Expira en ${hRestantes}h ${mRestantes}m</span>
        </div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn-mini" onclick="cargarBorrador('${d.id}')">Continuar</button>
        <button class="btn-mini btn-mini-r" onclick="eliminarBorrador('${d.id}',event)">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

async function cargarBorrador(id) {
  toast('⏳ Cargando...');
  const d = window._fb ? await window._fb.cargar(id) : null;
  if(!d) { toast('⚠️ No se pudo cargar','rojo'); return; }
  tipoActual = d.tipo; borradorId = id; createdAt = d.createdAt || d.ts || Date.now(); estadoActual = d.estado || 'construccion';
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
  setTimeout(actualizarBtnFinalizar, 400);
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

  <div class="seccion" style="margin-bottom:12px">
    <div style="background:var(--azul);border-radius:var(--rlg);padding:14px 18px;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:600;color:white;white-space:nowrap;padding-top:3px">👷 Responsable de Empaque:</span>
      <div style="flex:1">
        ${mkResp('emp_general','Responsable de Empaque')}
      </div>
    </div>
  </div>

  <div class="seccion" id="sec-empaque">
    <div class="sec-header" onclick="toggleSec(this)">
      <div class="sec-icon">📦</div>
      <div class="sec-titulo">Empaque</div>
      <span class="sec-chev ab">▼</span>
    </div>
    <div class="sec-body ab">
      ${preg(1,'¿Se lavaron máquinas durante el turno?','emp_lavado',
        `<textarea class="rdet" data-campo="emp_lavado_cuales" placeholder="¿Qué máquinas se lavaron? Nombre y número..." oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de las máquinas lavadas</div>
         ${foto('Adjuntar foto de cada máquina lavada','Una foto por máquina','f_lavado')}`
      )}

      ${preg(2,'¿Hay máquinas fuera de servicio?','emp_fs',
        tbl('t-emp-fs',['Máquina','Motivo / Falla','Desde cuándo'])
      )}

      ${preg(3,'¿Salieron exportaciones durante el turno?','emp_exp',
        `${tbl('t-emp-exp',['Referencia','Lote','Destino / Cliente'])}
         <div class="nota-info" style="margin-top:8px">
           <strong>📌 Fotos deben incluir:</strong> producto, leyenda, peso, embalaje y sticker de la caja.
         </div>
         ${foto('Fotos de exportaciones','Producto + leyenda + peso + embalaje + sticker','f_exp')}`
      )}

      ${preg(4,'¿Hay producto con más de 2 días de producción en tolvas?','emp_tolvas',
        tblTolvas('t-emp-tolvas')
      )}

      ${preg(5,'¿Salió producto no conforme durante el turno?','emp_pnc',
        `${tbl('t-emp-pnc',['Producto','Área','Causa','Cantidad'])}
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto del formato de no conforme</div>
         ${foto('Adjuntar foto del formato diligenciado','Foto obligatoria del formato','f_pnc')}`
      )}

      ${preg(6,'¿Salieron láminas no conformes durante el turno?','emp_laminas',
        `${tbl('t-emp-laminas',['Referencia','Tipo de no conformidad','Cantidad'])}
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto del formato y de la lámina</div>
         ${foto('Foto del formato + foto de la lámina','Adjuntar ambas fotos','f_laminas')}`
      )}

      ${preg(7,'¿Hubo novedades con fechas de empaque?','emp_fechas',
        `<textarea class="rdet" data-campo="emp_fechas_accion" placeholder="¿Qué se hizo? Describa la acción tomada..." oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de la novedad</div>
         ${foto('Adjuntar evidencia fotográfica','Foto de la novedad de fechas','f_fechas')}`
      )}

      ${preg(8,'¿Hay algún cambio o autorización de producto que no se saca habitualmente?','emp_cambios',
        `<textarea class="rdet" data-campo="emp_cambios_cual" placeholder="¿Cuál producto y quién autorizó?" oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de la novedad / autorización</div>
         ${foto('Adjuntar evidencia fotográfica','Foto del cambio o autorización','f_cambios')}`
      )}

      ${preg(9,'¿Se realizó liberación de sticker de alguna referencia nacional (diferente a exportación)?','emp_sticker',
        `${tbl('t-emp-sticker',['Referencia','Lote','Cliente','Motivo'])}
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto del sticker liberado (referencia, lote, sticker)</div>
         ${foto('Foto del sticker','Adjuntar foto del sticker de la referencia liberada','f_sticker')}`
      )}

      <div class="pregunta" id="preg-rx">
        <div class="preg-label"><span class="pnum">10</span>Rayos X — Estado y productos inspeccionados</div>
        <div class="grid2" style="margin-bottom:6px">
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--txt-s);margin-bottom:4px">¿RX1 se encuentra operando?</div>
            <div class="sino-row" data-key="emp_rx1_op">
              <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
              <button class="rbtn" onclick="siNo(this,'no')">No</button>
            </div>
            <div class="cond-no" style="display:none;margin-top:6px">
              <textarea class="rdet" data-campo="emp_rx1_motivo" placeholder="¿Por qué no está operando RX1?" oninput="autoSave()" style="min-height:50px"></textarea>
            </div>
          </div>
          <div>
            <div style="font-size:12px;font-weight:500;color:var(--txt-s);margin-bottom:4px">¿RX2 se encuentra operando?</div>
            <div class="sino-row" data-key="emp_rx2_op">
              <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
              <button class="rbtn" onclick="siNo(this,'no')">No</button>
            </div>
            <div class="cond-no" style="display:none;margin-top:6px">
              <textarea class="rdet" data-campo="emp_rx2_motivo" placeholder="¿Por qué no está operando RX2?" oninput="autoSave()" style="min-height:50px"></textarea>
            </div>
          </div>
        </div>
        <div style="font-size:12px;font-weight:500;color:var(--txt-s);margin-bottom:6px">Productos inspeccionados</div>
        ${tblSel('t-emp-rx',['Equipo','Referencia','Lote'],0,['RX1','RX2'])}
      </div>

      ${preg(11,'¿Hubo máquinas con desviaciones de peso durante el turno?','emp_peso',
        tbl('t-emp-peso',['Máquina','Referencia','Desviación registrada','Acción tomada'])
      )}

      <div class="pregunta">
        <div class="preg-label"><span class="pnum">12</span>Otras novedades del turno</div>
        <textarea class="rdet" data-campo="emp_otras" style="min-height:80px" placeholder="Describa cualquier otra novedad relevante del turno..." oninput="autoSave()"></textarea>
        <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de otras novedades</div>
        <div class="fzona" onclick="this.querySelector('input').click()">
          <input type="file" accept="image/*" multiple onchange="agregarFotos(this)">
          <div>📷 Adjuntar fotos si aplica</div>
          <div class="fzona-txt">Fotos de novedades adicionales</div>
        </div>
        <div class="fgrid" data-fid="emp_otras_fotos"></div>
      </div>
    </div>
  </div>`;

  document.querySelector('[data-campo="fecha"]').valueAsDate = new Date();
}

/* ══════════════════════════════════════════════
   FORMULARIO PROCESOS
══════════════════════════════════════════════ */


function noOperoBloque(key, fid) {
  return preg('a','¿Se hizo limpieza de la línea?',`${key}_limp_paro`,
    `<textarea class="rdet" data-campo="${key}_limp_paro_det" placeholder="¿Qué se limpió? Describa la limpieza realizada..." oninput="autoSave()"></textarea>
     <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de la limpieza</div>
     ${foto('Adjuntar fotos de limpieza','Evidencia fotográfica',fid)}`,
    `<div style="background:var(--gris);border-radius:var(--r);padding:8px 12px;font-size:12px;color:var(--txt-s)">No se realizó limpieza en esta línea durante el turno.</div>`
  );
}

function renderPE() {
  const c = document.getElementById('form-content');

  function secExtruido(n) {
    const k = `ext${n}`;
    return sec(`ext-l${n}`, '⚙️', `Extruido — Línea ${n}`,
      
      preg(1, `¿La Línea ${n} operó durante el turno?`, `${k}_opera`,
        `<div class="nota-info">Complete la información de operación</div>
        <div class="pregunta">
          <div class="preg-label"><span class="pnum">a</span>¿Qué extrusor se trabajó en esta línea?</div>
          <textarea class="rdet" data-campo="${k}_extrusor" placeholder="Ej. Extrusor 2..." oninput="autoSave()"></textarea>
        </div>
        ${preg('b','¿Se hizo limpieza de extrusores?',`${k}_limp_ext`,
          tbl(`t-${k}-limp`,['Extrusor limpiado','Tipo de limpieza','Observaciones'],1)
        )}
        <div class="pregunta">
          <div class="preg-label"><span class="pnum">c</span>¿Qué productos salieron durante el turno?</div>
          ${tbl(`t-${k}-prod`,['Referencia','Observaciones'],2)}
        </div>
        ${preg('d','¿Se agregaron otros ingredientes a la mezcla? (papa, extruido, rosquilla)',`${k}_ingred`,
          tbl(`t-${k}-ingred`,['Ingrediente','Cantidad (kg)','Motivo'],1)
        )}
        ${preg('e','¿Las densidades del producto terminado cumplen con los parámetros?',`${k}_dens`,``,
          `<textarea class="rdet" data-campo="${k}_dens_mot" placeholder="¿Por qué no cumplen? Describa la desviación..." oninput="autoSave()"></textarea>
           <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de la desviación</div>
           ${foto('Adjuntar foto','Foto si no cumple',`f_${k}_dens`)}`
        )}
        ${preg('f','¿Las dimensiones del producto terminado cumplen con los parámetros?',`${k}_dim`,``,
          `<textarea class="rdet" data-campo="${k}_dim_mot" placeholder="¿Por qué no cumplen? ¿Qué se hizo?" oninput="autoSave()"></textarea>
           <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de lo que no cumple</div>
           ${foto('Adjuntar fotos de incumplimientos','Fotos de desviaciones',`f_${k}_dim`)}`
        )}
        ${preg('g','¿Salió producto no conforme (PNC) durante el turno en esta línea?',`${k}_pnc`,
          tbl(`t-${k}-pnc`,['Referencia','Causa','Cantidad','¿Qué se hizo?'],1)
        )}`,
        noOperoBloque(k, `f_${k}_limp`)
      )
    );
  }
    function bloquesPellet(k) {
    return `
      ${preg('A','¿Las temperaturas superaron los 180°C?',`${k}_pell_temp`,
        tbl(`t-${k}-pell-temp`,['T° registrada','Hora','Acción tomada'],1)
      )}
      ${preg('B','¿Las densidades presentaron desviaciones?',`${k}_pell_dens`,
        tbl(`t-${k}-pell-dens`,['Referencia','Densidad registrada','Parámetro','Causa'],1)
      )}
      ${preg('C','¿Se generó producto no conforme?',`${k}_pell_pnc`,
        tbl(`t-${k}-pell-pnc`,['Referencia','Causa','Cantidad','¿Qué se hizo?'],1)
      )}
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">D</span>Acciones correctivas del turno</div>
        <textarea class="rdet" data-campo="${k}_pell_acc" placeholder="Describa las acciones implementadas..." oninput="autoSave()"></textarea>
      </div>
      ${foto('Fotos de PNC / tanque','Evidencia fotográfica',`f_${k}_pell`)}`;
  }

  function secLineaFlex(id, icon, nombre, opPrincipal, pregsPrincipal) {
    const k = id;
    const PELLETS = ['Chicharrón','Tocineta','Chicharrón Carnudo','Cebollita'];
    const pelletBtns = PELLETS.map(p =>
      `<button class="rbtn" style="font-size:11px" onclick="selProceso('${k}','pellet','${p}')">${p}</button>`
    ).join('');
    return sec(id, icon, nombre, `
      ${preg(1, `¿La línea de ${nombre} operó durante el turno?`, `${k}_opera`,
        `<div class="pregunta">
          <div class="preg-label"><span class="pnum">a</span>¿Qué se procesó en esta línea?</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            <button class="rbtn" id="btn-${k}-princ" onclick="selProceso('${k}','principal')">${opPrincipal}</button>
            <div style="width:100%;font-size:11px;color:var(--txt-s);margin:4px 0 2px">Pellet:</div>
            ${pelletBtns}
          </div>
          <input type="hidden" data-campo="${k}_proceso_tipo" id="${k}_proceso_tipo">
          <input type="hidden" data-campo="${k}_proceso_pellet" id="${k}_proceso_pellet">
        </div>
        <div id="bloque-${k}-princ" style="display:none">
          <div class="nota-info" style="font-size:11px">Procesando: <strong>${opPrincipal}</strong></div>
          ${pregsPrincipal}
        </div>
        <div id="bloque-${k}-pellet" style="display:none">
          <div class="nota-info" style="font-size:11px">Procesando pellet: <strong id="lbl-${k}-pellet">—</strong></div>
          ${tbl(`t-${k}-pell-prod`,['Referencia','% Saborización','Observaciones'],2)}
          ${bloquesPellet(k)}
        </div>`,
        noOperoBloque(k, `f_${k}_limp`)
      )}
    `);
  }

  const pregsTortilla = `
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">a</span>¿Qué referencias salieron?</div>
      ${tbl('t-tort-prod',['Referencia','% Saborización','Observaciones'],2)}
    </div>

    ${preg('b','¿Los tiempos de reposo se están cumpliendo?','tort_reposo',``,
      tbl('t-tort-reposo',['Referencia','Tiempo real','Tiempo requerido','Motivo'],1)
    )}

    <div class="pregunta">
      <div class="preg-label"><span class="pnum">c</span>¿Qué se hizo con el maíz durante el turno? <span style="font-size:11px;color:var(--txt-s)">(puede seleccionar varias)</span></div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:8px">
        <button class="rbtn" id="btn-maiz-reposo" onclick="toggleMaiz('reposo',this)">Se procesó maíz en reposo</button>
        <button class="rbtn" id="btn-maiz-cocinar" onclick="toggleMaiz('cocinar',this)">Se pusieron tanques a cocinar</button>
        <button class="rbtn" id="btn-maiz-nada" onclick="toggleMaiz('nada',this)">No se procesó maíz</button>
      </div>
      <div id="bloque-maiz-reposo" style="display:none;margin-top:6px">
        <label style="font-size:12px;color:var(--txt-s)">Maíz en reposo procesado:</label>
        ${tbl('t-tort-maiz-rep',['Tanque','Cantidad (kg)','Tiempo de reposo','Observaciones'],1)}
      </div>
      <div id="bloque-maiz-cocinar" style="display:none;margin-top:6px">
        <label style="font-size:12px;color:var(--txt-s)">Nuevos tanques puestos a cocinar:</label>
        ${tbl('t-tort-maiz-coc',['Tanque','Cantidad (kg)','Hora inicio cocción','Observaciones'],1)}
      </div>
      <input type="hidden" data-campo="tort_maiz_estado" id="tort_maiz_estado">
    </div>

    ${preg('d','¿Se garantizó la selección de PNC a la salida del horno y del freedor?','tort_sel',
      `<textarea class="rdet" data-campo="tort_sel_si_det" placeholder="Describa cómo se realizó la selección en horno y freedor..." oninput="autoSave()"></textarea>
       ${foto('📷 Fotos de selección PNC — horno y freedor','Adjuntar fotos de ambos puntos','f_tort_sel')}`,
      `<textarea class="rdet" data-campo="tort_sel_no_det" placeholder="¿Por qué no se garantizó? Describa qué pasó..." oninput="autoSave()"></textarea>`
    )}

    ${preg('e','¿Hubo producto no conforme?','tort_pnc',
      `${tbl('t-tort-pnc',['Referencia','Causa','Cantidad','¿Qué se hizo?'],1)}
       ${foto('📷 Fotos del PNC','Adjuntar evidencia fotográfica del producto no conforme','f_tort_pnc')}`
    )}`;

  const pregsTrocillo = `
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">a</span>Registro de producción</div>
      ${tbl('t-trocillo',['Referencia','Peso Crudo','Peso Freído','T. Reposo','T. Freído','Responsable'])}
    </div>
    <div class="grid2" style="margin-bottom:12px">
      <div><div class="preg-label"><span class="pnum">b</span>Tipo de aceite</div>
        <select class="rinp" data-campo="troc_aceite" onchange="autoSave()"><option value="">Seleccione...</option><option>Nuevo</option><option>Reutilizado</option><option>Mezcla</option></select></div>
      <div><div class="preg-label"><span class="pnum">c</span>¿Hubo exportación?</div>
        <div class="sino-row" data-key="troc_exp">
          <button class="rbtn" onclick="siNo(this,'si')">Sí</button>
          <button class="rbtn" onclick="siNo(this,'no')">No</button>
        </div>
        <div class="cond-si" style="display:none">${tbl('t-troc-exp',['Referencia','Lote','Destino'],1)}</div>
      </div>
    </div>
    ${preg('d','¿Se realizaron reprocesos?','troc_rep',tbl('t-troc-rep',['Tipo','Cantidad (kg)','Motivo']))}
    ${preg('e','¿Las dimensiones presentaron incumplimientos?','troc_dim',``,
      `<textarea class="rdet" data-campo="troc_dim_mot" placeholder="¿Por qué no cumplen? ¿Qué se hizo?" oninput="autoSave()"></textarea>
       ${foto('Foto si no cumple','Solo si hubo incumplimiento','f_troc_dim')}`
    )}
    ${preg('f','¿Las densidades presentaron desviaciones?','troc_dens',``,
      tbl('t-troc-dens',['Referencia','Densidad','Parámetro','Causa'],1)
    )}
    ${preg('g','¿Hubo algún equipo con falla?','troc_falla',
      tbl('t-troc-falla',['Equipo','Descripción de la falla','Acción tomada'])
    )}
    <div class="sep"></div>
    <div class="preg-label" style="margin-bottom:8px"><strong>Dimensiones antes del reposo</strong></div>
    <div class="twrap"><table class="reg" id="t-troc-antes">
      <thead><tr><th>Variable</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:600;background:var(--gris)">Largo</td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td></tr>
        <tr><td style="font-weight:600;background:var(--gris)">Ancho</td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td></tr>
        <tr><td style="font-weight:600;background:var(--gris)">Espesor</td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td></tr>
      </tbody>
    </table></div>
    <div class="preg-label" style="margin:12px 0 8px"><strong>Dimensiones después del freído</strong></div>
    <div class="twrap"><table class="reg" id="t-troc-despues">
      <thead><tr><th>Variable</th><th>M1</th><th>M2</th><th>M3</th><th>M4</th><th>M5</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:600;background:var(--gris)">Largo</td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td></tr>
        <tr><td style="font-weight:600;background:var(--gris)">Ancho</td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td></tr>
        <tr><td style="font-weight:600;background:var(--gris)">Espesor</td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td><td><input type="text" oninput="autoSave()"></td></tr>
      </tbody>
    </table></div>`;

  const pregsPelletEst = `
    ${preg('a','¿Se realizaron limpiezas?','pell_limp',
      `<select class="rinp" data-campo="pell_limp_tipo" style="margin-bottom:6px" onchange="autoSave()"><option>Profunda</option><option>Parcial</option><option>Cambio de referencia</option></select>
       <textarea class="rdet" data-campo="pell_limp_det" placeholder="Describa las limpiezas..." oninput="autoSave()"></textarea>`
    )}
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">b</span>Tipo de aceite</div>
      <select class="rinp" data-campo="pell_aceite" onchange="autoSave()"><option value="">Seleccione...</option><option>Nuevo</option><option>Reutilizado</option></select>
    </div>
    ${preg('c','¿Las temperaturas superaron los 180°C?','pell_temp',tbl('t-pell-temp',['Referencia','T° registrada','Hora','Acción']))}
    ${preg('d','¿Las densidades presentaron desviaciones?','pell_dens',tbl('t-pell-dens',['Referencia','Densidad','Parámetro','Causa']))}
    ${preg('e','¿Se realizaron mezclas de producto?','pell_mezcla',tbl('t-pell-mezcla',['Productos mezclados','Proporción','Obs']))}
    ${preg('f','¿Se generó producto no conforme?','pell_pnc',tbl('t-pell-pnc',['Referencia','Causa','Cantidad','¿Qué se hizo?']))}
    <div class="pregunta">
      <div class="preg-label"><span class="pnum">g</span>TPM del turno</div>
      <input class="rinp" type="text" data-campo="pell_tpm" placeholder="Registro TPM" oninput="autoSave()">
    </div>
    <div class="sep"></div>
    ${tbl('t-pellet',['Referencia','% Saborización','T° (°C)','¿Cumple T°?','Observaciones'])}
    ${foto('Fotos de tanque y PNC','Fotos obligatorias','f_pellet_fotos')}`;

  const secRos = sec('rosquilla','🔵','Rosquilla',
    preg(1,'¿La línea de Rosquilla operó durante el turno?','ros_opera',
      `<div class="nota-info">Complete la información de producción</div>
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">a</span>Tabla de producción del turno</div>
        ${tbl('t-rosquilla',['Referencia','# Batches','Corte crudo','Peso final','T° Amb.','T° Masa','T. Reposo','Humedad %','T° Cuarto','Amasadores','Horneros'],2)}
      </div>
      <div class="sep"></div>
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">b</span>Formulación utilizada — ingrediente y cantidad</div>
        ${tbl('t-ros-form',['Ingrediente','Cantidad (kg/g)'],3)}
      </div>
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">c</span>Queso utilizado</div>
        <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">
          <button class="rbtn" onclick="selQueso(this,'dona-rosa')">Doña Rosa</button>
          <button class="rbtn" onclick="selQueso(this,'colanta')">Colanta</button>
          <button class="rbtn" onclick="selQueso(this,'otro')">Otro proveedor</button>
          <button class="rbtn" onclick="selQueso(this,'mezcla')">Mezcla</button>
        </div>
        <input type="hidden" data-campo="ros_queso_prov" id="ros_queso_prov">
        <div id="ros-queso-otro" style="display:none;margin-bottom:8px">
          <input class="rinp" type="text" data-campo="ros_queso_otro_nombre" placeholder="¿Cuál proveedor?" oninput="autoSave()">
        </div>
        <div id="ros-queso-mezcla" style="display:none;margin-bottom:8px">
          <textarea class="rdet" data-campo="ros_queso_mezcla_det" placeholder="¿Cuál mezcla se hizo y en qué proporción? Ej. 70% Doña Rosa + 30% Colanta..." oninput="autoSave()" style="min-height:56px"></textarea>
        </div>
        <input class="rinp" type="text" data-campo="ros_queso_kg" placeholder="Cantidad total utilizada (kg)" style="margin-top:4px" oninput="autoSave()">
      </div>
      ${preg('d','¿Se liberó queso durante el turno?','ros_queso_lib',
        tbl('t-ros-queso',['Queso liberado','Cantidad (kg)','PNC generado'],1)
      )}
      ${preg('e','¿Faltó alguna materia prima durante el turno?','ros_mp',
        tbl('t-ros-mp',['Materia prima faltante','Impacto en proceso','Acción tomada'],1)
      )}
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">f</span>Estado de los hornos durante el turno</div>
        <div class="grid2" style="margin-bottom:8px">
          <div><label style="font-size:12px;color:var(--txt-s)">Hornos funcionales</label>
            <input class="rinp" type="text" data-campo="ros_hornos_func" placeholder="Ej. 4 de 6" oninput="autoSave()"></div>
          <div><label style="font-size:12px;color:var(--txt-s)">Hornos en operación</label>
            <input class="rinp" type="text" data-campo="ros_hornos_op" placeholder="Ej. 3" oninput="autoSave()"></div>
        </div>
        <textarea class="rdet" data-campo="ros_hornos_nov" placeholder="Novedades en hornos (fallas, mantenimientos, otros)..." oninput="autoSave()"></textarea>
        <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de novedades en hornos</div>
        ${foto('Fotos de hornos','Adjuntar fotos de lo evidenciado','f_ros_hornos')}
      </div>
      <div class="pregunta">
        <div class="preg-label"><span class="pnum">g</span>¿Cómo salió el producto durante el turno?</div>
        <div class="sino-row" data-key="ros_prod_conf">
          <button class="rbtn" onclick="siNo(this,'si')">Conforme</button>
          <button class="rbtn" onclick="siNo(this,'no')">No conforme</button>
        </div>
        <div class="cond-no" style="display:none">
          <div style="background:var(--rojo-cl);border:1px solid var(--rojo-b);border-radius:var(--r);padding:12px;margin-top:8px">
            <textarea class="rdet" data-campo="ros_nc_accion" placeholder="¿Qué se hizo con el producto no conforme?" oninput="autoSave()" style="margin-bottom:10px"></textarea>
            <div style="font-size:12px;font-weight:500;margin-bottom:6px;color:var(--txt)">¿Se logró que quedara conforme?</div>
            <div class="sino-row" data-key="ros_nc_logro">
              <button class="rbtn" onclick="siNo(this,'si')">Sí, quedó conforme</button>
              <button class="rbtn" onclick="siNo(this,'no')">No — salió como PNC</button>
            </div>
            <div class="cond-no" style="display:none">
              ${tbl('t-ros-pnc',['Referencia','Causa','Cantidad','¿Qué se hizo?'],1)}
            </div>
          </div>
        </div>
      </div>
      ${preg('h','¿Los parámetros del producto están dentro de la conformidad?','ros_params',``,
        `<textarea class="rdet" data-campo="ros_params_det" placeholder="¿Cuáles parámetros no están conformes y por qué?" oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Foto de parámetros no conformes</div>
         ${foto('Adjuntar foto','Evidencia de parámetros fuera de spec','f_ros_params')}`
      )}`,
      `${preg('a','¿Se hizo limpieza de la línea?','ros_limp_paro',
        `<textarea class="rdet" data-campo="ros_limp_paro_det" placeholder="¿Qué se limpió? Describa la limpieza realizada..." oninput="autoSave()"></textarea>
         <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de la limpieza</div>
         ${foto('Adjuntar fotos de limpieza','Evidencia fotográfica','f_ros_limp')}`,
        `<div style="background:var(--gris);border-radius:var(--r);padding:8px 12px;font-size:12px;color:var(--txt-s)">No se realizó limpieza en la línea de Rosquilla.</div>`
      )}`
    )
  );

  c.innerHTML = `
  <div class="datos-card">
    <div class="dato-item"><label>Fecha</label><input type="date" class="dato-inp" data-campo="fecha" onchange="autoSave()"></div>
    <div class="dato-item"><label>Turno</label>
      <select class="dato-inp" data-campo="turno" onchange="autoSave()"><option>1</option><option>2</option><option>3</option></select></div>
  </div>

  <div class="seccion" style="margin-bottom:12px">
    <div style="background:var(--azul);border-radius:var(--rlg);padding:14px 18px;display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap">
      <span style="font-size:13px;font-weight:600;color:white;white-space:nowrap;padding-top:3px">👷 Inspectores de proceso:</span>
      <div style="flex:1">
        ${mkResp('pe_general','Inspectores de proceso')}
      </div>
    </div>
  </div>
  ${secExtruido(1)} ${secExtruido(2)} ${secExtruido(3)}
  ${secRos}
  ${secLineaFlex('linea-tort','🟤','Tortilla','Tortilla',pregsTortilla)}
  ${secLineaFlex('linea-troc','🟧','Trocillo','Trocillo',pregsTrocillo)}
  ${secLineaFlex('linea-pell','🔶','Pellet',pregsPelletEst)}
  ${secPapaUnificado()}`;

  document.querySelector('[data-campo="fecha"]').valueAsDate = new Date();
}


/* ══════ MÓDULO PAPA UNIFICADO ══════ */
function secPapaUnificado() {

  function subSecLinea(id) {
    const L = id.toUpperCase();
    const k = id; // daf, pc4, pc6

    return `
    <div style="border:1.5px solid var(--azul-b);border-radius:var(--r);margin-bottom:14px;overflow:visible">
      <div style="background:var(--azul-cl);padding:10px 14px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;border-radius:var(--r) var(--r) 0 0"
           onclick="toggleSubSec('sub-${k}',this)">
        <span style="font-size:13px;font-weight:600;color:var(--azul)">🥔 Línea ${L}</span>
        <span id="chev-sub-${k}" style="color:var(--txt-s);font-size:12px">▼</span>
      </div>
      <div id="sub-${k}" style="display:none;padding:14px">

        ${preg(1, `¿La línea ${L} operó durante el turno?`, `${k}_opera`,
          /* SÍ OPERA */
          `<div class="nota-info" style="margin-bottom:10px">Complete información de la línea ${L}</div>

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">a</span>Modo de alimentación</div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">
              <button class="rbtn" id="btn-${k}-manual" onclick="selAlimentacion('${k}','manual')">Manual</button>
              <button class="rbtn" id="btn-${k}-lavador" onclick="selAlimentacion('${k}','lavador')">Lavador</button>
            </div>
            <input type="hidden" data-campo="${k}_alimentacion" id="${k}_alimentacion">
            <div id="bloque-${k}-manual" style="display:none">
              <div class="grid2">
                <div><label style="font-size:12px;color:var(--txt-s)">Lote de papa</label>
                  <input class="rinp" type="text" data-campo="${k}_lote" placeholder="Lote" oninput="autoSave()"></div>
                <div><label style="font-size:12px;color:var(--txt-s)">Referencia de papa</label>
                  <input class="rinp" type="text" data-campo="${k}_ref_manual" placeholder="Referencia" oninput="autoSave()"></div>
              </div>
            </div>
          </div>

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">b</span>¿Qué referencia se trabaja?</div>
            <div style="display:flex;gap:7px;flex-wrap:wrap">
              <button class="rbtn" onclick="selRef('${k}',this,'Lisa')">Lisa</button>
              <button class="rbtn" onclick="selRef('${k}',this,'Oreada')">Oreada</button>
              <button class="rbtn" onclick="selRef('${k}',this,'Fosforito')">Fosforito</button>
            </div>
            <input type="hidden" data-campo="${k}_referencia" id="${k}_referencia">
          </div>

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">c</span>¿Qué sabor?</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
              ${['Natural','Pollo','Limón','BBQ','Picante','Mayonesa','Crema y cebolla','Hot'].map(s =>
                `<button class="rbtn" style="font-size:11px" onclick="toggleSabor('${k}',this,'${s}')">${s}</button>`
              ).join('')}
              <button class="rbtn" style="font-size:11px" onclick="toggleSabor('${k}',this,'Otro')">Otro</button>
            </div>
            <input type="hidden" data-campo="${k}_sabores" id="${k}_sabores">
            <div id="${k}-sabor-otro" style="display:none;margin-top:6px">
              <input class="rinp" type="text" data-campo="${k}_sabor_otro" placeholder="Especificar sabor..." oninput="autoSave()">
            </div>
          </div>

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">d</span>Evidencia de selección de producto no conforme</div>
            <div class="grid2" style="margin-bottom:8px">
              <div><label style="font-size:12px;color:var(--txt-s)">Papa fría — observación</label>
                <textarea class="rdet" data-campo="${k}_sel_fria" placeholder="Estado y cantidad de papa fría..." oninput="autoSave()" style="min-height:50px"></textarea></div>
              <div><label style="font-size:12px;color:var(--txt-s)">Papa caliente — observación</label>
                <textarea class="rdet" data-campo="${k}_sel_caliente" placeholder="Estado y cantidad de papa caliente..." oninput="autoSave()" style="min-height:50px"></textarea></div>
            </div>
            <input class="rinp" type="text" data-campo="${k}_sel_personal" placeholder="Personal de selección (nombres)" oninput="autoSave()" style="margin-bottom:8px">
            ${foto('📷 Evidencia de selección no conforme','Fotos de papa fría, caliente y personal',`f_${k}_sel`)}
          </div>

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">e</span>Calibración y limpieza de tambores</div>
            ${tbl(`t-${k}-tambores`,['# Tambor','Tipo (Lisa/Oreada)','Responsable Calidad (Inspector)','Responsable Mtto (Mecánico)'],2)}
          </div>

          ${preg('f','¿Se hizo limpieza de tanque?',`${k}_limp_tanque`,
            foto('📷 Evidencia de limpieza de tanque','Adjuntar foto obligatoria',`f_${k}_tanque`)
          )}

          ${preg('g','¿Se realizó limpieza de saborizador y bombo en cambio de referencia o sabor?',`${k}_limp_sabor`,
            `<textarea class="rdet" data-campo="${k}_limp_sabor_det" placeholder="Especifique qué se limpió y en qué cambio..." oninput="autoSave()"></textarea>`
          )}

          ${preg('h','¿Se reprocesó papa durante el turno?',`${k}_reproc`,
            `<div class="grid2" style="margin-bottom:8px">
              <div><label style="font-size:12px;color:var(--txt-s)">Motivo del reproceso</label>
                <textarea class="rdet" data-campo="${k}_reproc_motivo" placeholder="Describa el motivo..." oninput="autoSave()" style="min-height:50px"></textarea></div>
              <div>
                <label style="font-size:12px;color:var(--txt-s)">Tipo de reproceso</label>
                <div style="display:flex;gap:7px;margin-top:4px;flex-wrap:wrap">
                  <button class="rbtn" onclick="selReproc('${k}',this,'cruda')">Papa cruda</button>
                  <button class="rbtn" onclick="selReproc('${k}',this,'otra-ref')">Otra referencia saborizada</button>
                </div>
                <input type="hidden" data-campo="${k}_reproc_tipo" id="${k}_reproc_tipo">
              </div>
            </div>`
          )}

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">i</span>Tipo de grasa</div>
            <div class="grid2">
              <div>
                <label style="font-size:12px;color:var(--txt-s)">¿Oleína o blend?</label>
                <div style="display:flex;gap:7px;margin-top:4px">
                  <button class="rbtn" onclick="selGrasa('${k}','oleina',this)">Oleína</button>
                  <button class="rbtn" onclick="selGrasa('${k}','blend',this)">Blend</button>
                </div>
                <input type="hidden" data-campo="${k}_grasa_tipo" id="${k}_grasa_tipo">
              </div>
              <div>
                <label style="font-size:12px;color:var(--txt-s)">Tipo de aceite</label>
                <div style="display:flex;gap:7px;margin-top:4px">
                  <button class="rbtn" onclick="selAceite('${k}','reutilizado',this)">Reutilizado</button>
                  <button class="rbtn" onclick="selAceite('${k}','nuevo',this)">Arrancó con nuevo</button>
                </div>
                <input type="hidden" data-campo="${k}_aceite_tipo" id="${k}_aceite_tipo">
              </div>
            </div>
          </div>

          <div class="pregunta">
            <div class="preg-label"><span class="pnum">j</span>Otras novedades de la línea</div>
            <textarea class="rdet" data-campo="${k}_novedades" style="min-height:70px" placeholder="Describa otras novedades relevantes..." oninput="autoSave()"></textarea>
            ${foto('📷 Fotos de otras novedades','Adjuntar fotos si aplica',`f_${k}_novedades`)}
          </div>`,

          /* NO OPERA */
          `${preg('a','¿Se hizo limpieza de la línea?',`${k}_limp_paro`,
            `<textarea class="rdet" data-campo="${k}_limp_paro_det" placeholder="¿Qué se limpió?" oninput="autoSave()"></textarea>
             ${foto('Fotos de limpieza','Evidencia fotográfica',`f_${k}_limp`)}`,
            `<textarea class="rdet" data-campo="${k}_manejo_actual" placeholder="¿Cómo se viene manejando la línea?" oninput="autoSave()"></textarea>`
          )}`
        )}

      </div>
    </div>`;
  }

  return sec('papa','🥔','Papa — PC4, PC6 y DAF',
    mkResp('papa_general','Responsable(s) Líneas de Papa') + `

    <div class="sep"></div>
    <div style="font-size:13px;font-weight:600;color:var(--azul);margin-bottom:10px">🔧 Lavador de papa</div>

    ${preg(1,'¿El lavador de papa está funcionando?','lav_opera',
      `<div class="pregunta" style="border:none;padding:0;margin-bottom:10px">
        <div class="preg-label" style="margin-bottom:6px"><span class="pnum">a</span>¿Para qué líneas está alimentando el lavador? <span style="font-size:11px;color:var(--txt-s)">(puede seleccionar varias)</span></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button class="rbtn" id="btn-lav-pc4" onclick="toggleLavLinea('pc4',this)">PC4</button>
          <button class="rbtn" id="btn-lav-pc6" onclick="toggleLavLinea('pc6',this)">PC6</button>
          <button class="rbtn" id="btn-lav-daf" onclick="toggleLavLinea('daf',this)">DAF</button>
        </div>
        <input type="hidden" data-campo="lav_lineas" id="lav_lineas">
      </div>`,
      `<textarea class="rdet" data-campo="lav_motivo" placeholder="¿Por qué no está funcionando el lavador?" oninput="autoSave()"></textarea>`
    )}

    <div class="sep"></div>
    <div style="font-size:13px;font-weight:600;color:var(--azul);margin-bottom:10px">🥔 Tipo de papa y proveedor</div>
    <div class="pregunta" style="border:none;padding:0;margin-bottom:12px">
      <div style="font-size:12px;color:var(--txt-s);margin-bottom:6px">Seleccione el o los tipos de papa manejados en el turno:</div>
      <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">
        <button class="rbtn" id="btn-papa-r12" onclick="toggleTipoPapa('r12',this)">R12</button>
        <button class="rbtn" id="btn-papa-pareja" onclick="toggleTipoPapa('pareja',this)">Pareja</button>
        <button class="rbtn" id="btn-papa-cachirri" onclick="toggleTipoPapa('cachirri',this)">Cachirri</button>
      </div>
      <input type="hidden" data-campo="papa_tipos" id="papa_tipos">
      <div id="bloque-papa-r12" style="display:none;margin-bottom:8px">
        <label style="font-size:12px;color:var(--txt-s)">R12 — Proveedor</label>
        <input class="rinp" type="text" data-campo="papa_prov_r12" placeholder="Nombre del proveedor" oninput="autoSave()">
      </div>
      <div id="bloque-papa-pareja" style="display:none;margin-bottom:8px">
        <label style="font-size:12px;color:var(--txt-s)">Pareja — Proveedor</label>
        <input class="rinp" type="text" data-campo="papa_prov_pareja" placeholder="Nombre del proveedor" oninput="autoSave()">
      </div>
      <div id="bloque-papa-cachirri" style="display:none;margin-bottom:8px">
        <label style="font-size:12px;color:var(--txt-s)">Cachirri — Proveedor</label>
        <input class="rinp" type="text" data-campo="papa_prov_cachirri" placeholder="Nombre del proveedor" oninput="autoSave()">
      </div>
    </div>

    <div class="sep"></div>
    <div style="font-size:13px;font-weight:600;color:var(--azul);margin-bottom:10px">🌡️ Cuarto de papa</div>
    <div class="grid2" style="margin-bottom:10px">
      <div><label style="font-size:12px;color:var(--txt-s)">Temperatura del cuarto (°C)</label>
        <input class="rinp" type="text" data-campo="cuarto_papa_temp" placeholder="°C" oninput="autoSave()"></div>
      <div><label style="font-size:12px;color:var(--txt-s)">Humedad (%)</label>
        <input class="rinp" type="text" data-campo="cuarto_papa_hum" placeholder="%" oninput="autoSave()"></div>
    </div>
    ${foto('📷 Evidencia del termohigrometro','Adjuntar foto del termohigrometro','f_cuarto_papa')}

    <div class="sep"></div>
    <div style="font-size:13px;font-weight:600;color:var(--azul);margin-bottom:10px">🏭 Líneas de papa</div>
    ${subSecLinea('pc4')}
    ${subSecLinea('pc6')}
    ${subSecLinea('daf')}
  `);
}

function toggleSubSec(id, header) {
  const el = document.getElementById(id);
  const chev = document.getElementById('chev-sub-' + id.replace('sub-',''));
  if(!el) return;
  const open = el.style.display === 'block';
  el.style.display = open ? 'none' : 'block';
  if(chev) chev.textContent = open ? '▼' : '▲';
}

function toggleLavLinea(linea, btn) {
  btn.classList.toggle('si');
  const lineas = ['pc4','pc6','daf'].filter(l => {
    const b = document.getElementById('btn-lav-'+l);
    return b && b.classList.contains('si');
  });
  const inp = document.getElementById('lav_lineas');
  if(inp) inp.value = lineas.join(',');
  autoSave();
}

function toggleTipoPapa(tipo, btn) {
  btn.classList.toggle('si');
  const bloque = document.getElementById('bloque-papa-'+tipo);
  if(bloque) bloque.style.display = btn.classList.contains('si') ? 'block' : 'none';
  const tipos = ['r12','pareja','cachirri'].filter(t => {
    const b = document.getElementById('btn-papa-'+t);
    return b && b.classList.contains('si');
  });
  const inp = document.getElementById('papa_tipos');
  if(inp) inp.value = tipos.join(',');
  autoSave();
}

function selAlimentacion(linea, modo) {
  ['manual','lavador'].forEach(m => {
    const b = document.getElementById(`btn-${linea}-${m}`);
    if(b) b.classList.remove('si');
  });
  const btn = document.getElementById(`btn-${linea}-${modo}`);
  if(btn) btn.classList.add('si');
  const inp = document.getElementById(`${linea}_alimentacion`);
  if(inp) inp.value = modo;
  const bloque = document.getElementById(`bloque-${linea}-manual`);
  if(bloque) bloque.style.display = modo === 'manual' ? 'block' : 'none';
  autoSave();
}

function selRef(linea, btn, ref) {
  btn.closest('.pregunta').querySelectorAll('.rbtn').forEach(b => b.classList.remove('si'));
  btn.classList.add('si');
  const inp = document.getElementById(`${linea}_referencia`);
  if(inp) inp.value = ref;
  autoSave();
}

function toggleSabor(linea, btn, sabor) {
  btn.classList.toggle('si');
  const sabores = [...btn.closest('.pregunta').querySelectorAll('.rbtn.si')].map(b => b.textContent.trim());
  const inp = document.getElementById(`${linea}_sabores`);
  if(inp) inp.value = sabores.join(',');
  const otroBloque = document.getElementById(`${linea}-sabor-otro`);
  if(otroBloque) otroBloque.style.display = sabores.includes('Otro') ? 'block' : 'none';
  autoSave();
}

function selReproc(linea, btn, tipo) {
  btn.closest('div').querySelectorAll('.rbtn').forEach(b => b.classList.remove('si'));
  btn.classList.add('si');
  const inp = document.getElementById(`${linea}_reproc_tipo`);
  if(inp) inp.value = tipo;
  autoSave();
}

function selGrasa(linea, tipo, btn) {
  btn.closest('div').querySelectorAll('.rbtn').forEach(b => b.classList.remove('si'));
  btn.classList.add('si');
  const inp = document.getElementById(`${linea}_grasa_tipo`);
  if(inp) inp.value = tipo;
  autoSave();
}

function selAceite(linea, tipo, btn) {
  btn.closest('div').querySelectorAll('.rbtn').forEach(b => b.classList.remove('si'));
  btn.classList.add('si');
  const inp = document.getElementById(`${linea}_aceite_tipo`);
  if(inp) inp.value = tipo;
  autoSave();
}

function selQueso(btn, tipo) {
  const container = btn.closest('.pregunta');
  container.querySelectorAll('.rbtn').forEach(b => b.classList.remove('si'));
  btn.classList.add('si');
  const inp = document.getElementById('ros_queso_prov');
  if(inp) inp.value = tipo;
  const elOtro   = document.getElementById('ros-queso-otro');
  const elMezcla = document.getElementById('ros-queso-mezcla');
  if(elOtro)   elOtro.style.display   = tipo === 'otro'   ? 'block' : 'none';
  if(elMezcla) elMezcla.style.display = tipo === 'mezcla' ? 'block' : 'none';
  autoSave();
}

function toggleMaiz(tipo, btn) {
  if(tipo === 'nada') {
    // Deselect others, select nada
    ['reposo','cocinar'].forEach(t => {
      const b = document.getElementById('btn-maiz-'+t);
      if(b) b.classList.remove('si');
      const bl = document.getElementById('bloque-maiz-'+t);
      if(bl) bl.style.display = 'none';
    });
    btn.classList.toggle('si');
    const inp = document.getElementById('tort_maiz_estado');
    if(inp) inp.value = btn.classList.contains('si') ? 'nada' : '';
  } else {
    // Deselect nada, toggle this one
    const nada = document.getElementById('btn-maiz-nada');
    if(nada) nada.classList.remove('si');
    btn.classList.toggle('si');
    const bloque = document.getElementById('bloque-maiz-'+tipo);
    if(bloque) bloque.style.display = btn.classList.contains('si') ? 'block' : 'none';
    // Update estado
    const activos = ['reposo','cocinar'].filter(t => {
      const b = document.getElementById('btn-maiz-'+t);
      return b && b.classList.contains('si');
    });
    const inp = document.getElementById('tort_maiz_estado');
    if(inp) inp.value = activos.join(',');
  }
  autoSave();
}

function selProceso(lineaId, tipo, pelletTipo) {
  const PELLETS = ['Chicharrón','Tocineta','Chicharrón Carnudo','Cebollita'];
  const sec = document.getElementById('sec-' + lineaId);
  if(!sec) return;
  sec.querySelectorAll('.rbtn').forEach(b => {
    if(b.id === `btn-${lineaId}-princ` || PELLETS.includes(b.textContent.trim())) b.classList.remove('si');
  });
  const bloquePrinc = document.getElementById(`bloque-${lineaId}-princ`);
  const bloquePell  = document.getElementById(`bloque-${lineaId}-pellet`);
  if(bloquePrinc) bloquePrinc.style.display = tipo === 'principal' ? 'block' : 'none';
  if(bloquePell)  bloquePell.style.display  = tipo === 'pellet'    ? 'block' : 'none';
  if(tipo === 'principal') {
    const b = document.getElementById(`btn-${lineaId}-princ`);
    if(b) b.classList.add('si');
  } else if(tipo === 'pellet' && pelletTipo) {
    sec.querySelectorAll('.rbtn').forEach(b => { if(b.textContent.trim() === pelletTipo) b.classList.add('si'); });
    const lbl = document.getElementById(`lbl-${lineaId}-pellet`);
    if(lbl) lbl.textContent = pelletTipo;
  }
  const tipoInp = document.getElementById(`${lineaId}_proceso_tipo`);
  const pellInp = document.getElementById(`${lineaId}_proceso_pellet`);
  if(tipoInp) tipoInp.value = tipo;
  if(pellInp && pelletTipo) pellInp.value = pelletTipo;
  autoSave();
}


function renderMP() {
  const c = document.getElementById('form-content');
  c.innerHTML = `
  <div class="datos-card">
    <div class="dato-item"><label>Fecha</label><input type="date" class="dato-inp" data-campo="fecha" onchange="autoSave()"></div>
  </div>

  <div class="seccion" id="sec-mp">
    <div class="sec-header" onclick="toggleSec(this)">
      <div class="sec-icon">🌿</div>
      <div class="sec-titulo">Recepción de Materia Prima</div>
      <span class="sec-chev ab">▼</span>
    </div>
    <div class="sec-body ab">
      ${mkResp('mp','Responsable(s) Materia Prima')}

      ${preg(1,'¿Llegó papa?','mp_papa', `
        ${tbl('t-mp-papa',['Referencia','Proveedor','Aceptabilidad','Prueba sólidos (S/N)','% Sólidos'],2)}
        <textarea class="rdet" style="margin-top:8px" data-campo="mp_papa_obs" placeholder="Observaciones..." oninput="autoSave()"></textarea>
        ${foto('Fotos de recepción de papa','Adjuntar fotos','f_mp_papa')}
      `)}

      ${preg(2,'¿Llegó queso?','mp_queso', `
        ${tbl('t-mp-queso',['Proveedor','Peso (kg)','PNC'],1)}
        <textarea class="rdet" style="margin-top:8px" data-campo="mp_queso_obs" placeholder="Observaciones..." oninput="autoSave()"></textarea>
        ${foto('Fotos de recepción de queso','Adjuntar fotos','f_mp_queso')}
      `)}

      ${preg(3,'¿Llegó plátano?','mp_platano', `
        <div class="grid2" style="margin-bottom:8px">
          <div><label style="font-size:12px;color:var(--txt-s)">Referencia</label>
            <select class="rinp" data-campo="mp_platano_ref" onchange="autoSave()">
              <option value="">Seleccione...</option>
              <option>Pelado</option><option>Freído</option>
            </select></div>
          <div><label style="font-size:12px;color:var(--txt-s)">Proveedor</label>
            <input class="rinp" type="text" data-campo="mp_platano_prov" placeholder="Proveedor" oninput="autoSave()"></div>
        </div>
        <div class="preg-label" style="margin-bottom:5px;font-size:12px">Condiciones de transporte</div>
        <div class="sino-row" data-key="mp_platano_trans">
          <button class="rbtn" onclick="siNo(this,'si')">Conforme</button>
          <button class="rbtn" onclick="siNo(this,'no')">No conforme</button>
        </div>
        <div class="cond-no" style="display:none;margin-top:6px">
          <textarea class="rdet" data-campo="mp_platano_trans_det" placeholder="¿Cuál no conformidad?" oninput="autoSave()" style="min-height:50px"></textarea>
        </div>
        <textarea class="rdet" style="margin-top:8px" data-campo="mp_platano_obs" placeholder="Observaciones..." oninput="autoSave()"></textarea>
        ${foto('Fotos de recepción de plátano','Adjuntar fotos','f_mp_platano')}
      `)}

      ${preg(4,'¿Llegaron láminas?','mp_laminas', `
        ${tbl('t-mp-laminas',['Referencia','Proveedor','Lote','Observación'],2)}
      `)}

      ${preg(5,'¿Salieron láminas no conformes identificadas en la recepción?','mp_laminas_nc', `
        ${tbl('t-mp-laminas-nc',['Referencia','Proveedor','Motivo'],1)}
        ${foto('Foto de la lámina no conforme','Adjuntar foto','f_mp_laminas_nc')}
      `)}

      ${preg(6,'¿Llegó maíz?','mp_maiz', `
        ${tbl('t-mp-maiz',['Cuánto llegó (kg)','Lote','Proveedor','Observación'],1)}
        ${foto('Fotos de recepción de maíz','Adjuntar fotos','f_mp_maiz')}
      `)}

      <div class="sep"></div>
      <div class="preg-label" style="margin-bottom:8px"><strong>Otras recepciones</strong></div>
      ${tbl('t-mp-otras',['Producto','Lote','Fecha vencimiento','Observación'],2)}
      <div style="margin-top:8px;font-size:12px;font-weight:500;color:var(--txt-s)">📷 Fotos de otras recepciones</div>
      ${foto('Adjuntar fotos','Fotos de otras recepciones','f_mp_otras')}

      <div class="sep"></div>
      <div class="preg-label" style="margin-bottom:8px"><strong>Reporte de fechas cortas en bodega</strong></div>
      ${tbl('t-mp-fechas',['Materia prima','Lote','Fecha de vencimiento'],2)}

    </div>
  </div>`;

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
  const PW=210,PH=297,ML=14,MR=14,MT=20,MB=18,CW=PW-ML-MR;
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
    doc.setFillColor(...C.azul); doc.rect(0,0,PW,13,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(10);
    const titH = tipoActual==='emp'?'Informe de Empaque':tipoActual==='pe'?'Informe de Procesos':'Informe de Materia Prima';
    doc.text('Productos Vicky S.A.S. — '+titH, ML, 8.5);
    doc.setFont('helvetica','normal'); doc.setFontSize(8);
    const fecha=gv('fecha'),turno=gv('turno');
    doc.text(`Fecha: ${fecha} | Turno: ${turno} | Pág. ${pg}`, PW-ML, 8.5, {align:'right'});
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
      doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(11);
      doc.text(txt.toUpperCase(), ML+3, y+5.5); y+=11;
    } else {
      doc.setFillColor(...C.azulCl); doc.rect(ML,y,CW,7,'F');
      doc.setDrawColor(...C.azulM); doc.rect(ML,y,CW,7,'S');
      doc.setTextColor(...C.azulM); doc.setFont('helvetica','bold'); doc.setFontSize(10);
      doc.text(txt, ML+3, y+4.8); y+=9;
    }
  }

  // campo(label, val, sino, noMsg)
  // noMsg: texto descriptivo cuando la respuesta es NO (ej. "No se presentaron novedades")
  function campo(label, val, sino=null, noMsg='') {
    if(sino==='no') {
      const txt = noMsg || label;
      if(!val?.trim()) {
        // Solo texto descriptivo negativo, sin "[NO]"
        check(6);
        doc.setFillColor(...C.rojoCl); doc.rect(ML,y,CW,5.5,'F');
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...C.rojo);
        doc.text(txt, ML+2, y+3.8);
        y+=6; return;
      } else {
        // Hay motivo — mostrar label en rojo + motivo debajo
        check(7);
        doc.setFillColor(...C.rojoCl); doc.rect(ML,y,CW,5.5,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...C.rojo);
        doc.text(label, ML+2, y+3.8);
        y+=6;
        const lines = doc.splitTextToSize(val, CW-5);
        const h = lines.length*4.2+3;
        check(h);
        doc.setFillColor(252,252,252); doc.rect(ML,y,CW,h,'F');
        doc.setDrawColor(...C.rojoCl); doc.rect(ML,y,CW,h,'S');
        doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...C.negro);
        doc.text(lines, ML+2, y+3.5); y+=h+2;
        return;
      }
    }
    if(!val?.trim() && !sino) return;
    check(7);
    doc.setFillColor(...C.gris); doc.rect(ML,y,CW,5.5,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(...C.azulM);
    doc.text(label, ML+2, y+3.8);
    if(sino==='si') {
      doc.setTextColor(...C.verde); doc.setFont('helvetica','bold');
      doc.text('[SI]', PW-MR-2, y+3.8, {align:'right'});
    }
    y+=6;
    if(val?.trim()) {
      const lines = doc.splitTextToSize(val, CW-5);
      const h = lines.length*4.2+3;
      check(h);
      doc.setFillColor(252,252,252); doc.rect(ML,y,CW,h,'F');
      doc.setDrawColor(...C.grisM); doc.rect(ML,y,CW,h,'S');
      doc.setFont('helvetica','normal'); doc.setFontSize(8.5); doc.setTextColor(...C.negro);
      doc.text(lines, ML+2, y+3.5); y+=h+2;
    }
  }

  function tabla(headers, rows) {
    const valid = (rows||[]).filter(r=>r.some(v=>v?.trim()));
    if(!valid.length) return;
    check(16);
    const cw = CW/headers.length;
    doc.setFillColor(...C.azul); doc.rect(ML,y,CW,6,'F');
    doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(8);
    headers.forEach((h,i) => doc.text(h, ML+i*cw+1.5, y+4.2)); y+=6;
    valid.forEach((row,ri) => {
      const rh=5.5; check(rh);
      doc.setFillColor(...(ri%2===0?C.gris:C.blanco)); doc.rect(ML,y,CW,rh,'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(...C.negro);
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
      // Maintain original aspect ratio: fit within fw x 85mm
      let imgW = fw, imgH = fw/ratio;
      if(imgH > 85) { imgH = 85; imgW = imgH * ratio; }
      if(imgW > fw) { imgW = fw; imgH = imgW / ratio; }
      const capInp = img.closest('.fitem')?.querySelector('.fcap-inp');
      const capH = capInp?.value ? 8 : 0;
      const totalH = imgH + capH;
      if(col === 0) { check(totalH+4); rowY = y; rowH = totalH; }
      rowH = Math.max(rowH, totalH);
      const x = ML + col*(fw+gap);
      try {
        const fmt = img.src.startsWith('data:image/png')?'PNG':'JPEG';
        doc.addImage(img.src,fmt,x,rowY,imgW,imgH,'','MEDIUM');
        doc.setDrawColor(...C.grisM); doc.rect(x,rowY,imgW,imgH,'S');
        const cap = img.closest('.fitem')?.querySelector('.fcap-inp')?.value||'';
        if(cap) {
          doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(...C.suave);
          doc.text(cap, x+imgW/2, rowY+imgH+4.5, {align:'center', maxWidth:imgW});
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
  // Calcular semana del año y día de la semana (disponibles para nombre de archivo)
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

  // Banner título — fuente más grande
  doc.setFillColor(...C.azul); doc.rect(0,0,PW,22,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(17);
  doc.text(tit, PW/2, 10, {align:'center'});
  doc.setFontSize(10); doc.setFont('helvetica','normal');
  doc.text('PRODUCTOS VICKY S.A.S.', PW/2, 17, {align:'center'});

  // Bloque de datos en 2 columnas — más alto para fuente grande
  const bY = 25, bH = 30, col1W = CW*0.5;
  doc.setFillColor(...C.azulCl); doc.rect(ML, bY, CW, bH,'F');
  doc.setDrawColor(...C.azulM); doc.rect(ML, bY, CW, bH,'S');
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

  doc.setFontSize(10);
  col1.forEach(([l,v],i) => {
    doc.setFont('helvetica','bold'); doc.setTextColor(...C.azulM);
    doc.text(l, ML+3, bY+7+i*10);
    doc.setFont('helvetica','normal'); doc.setTextColor(...C.negro);
    const maxW = col1W - 28;
    const vt = doc.splitTextToSize(v, maxW);
    doc.text(vt[0]||v, ML+30, bY+7+i*10);
  });
  col2.forEach(([l,v],i) => {
    doc.setFont('helvetica','bold'); doc.setTextColor(...C.azulM);
    doc.text(l, ML+col1W+3, bY+7+i*8);
    doc.setFont('helvetica','normal'); doc.setTextColor(...C.negro);
    doc.text(v, ML+col1W+24, bY+7+i*8);
  });

  y = bY + bH + 7;
  pie();

  if(tipoActual==='emp') {
    titulo('Empaque');
    campo('Responsables', getResp('empaque').join(', ')||'—');
    campo('Máquinas lavadas en el turno', gv('emp_lavado_cuales'), gsino('emp_lavado'), 'No se lavaron máquinas en el turno');
    await fotos(gfgrid('empaque','emp_lavado'));
    titulo('Máquinas fuera de servicio',2); if(gsino('emp_fs')==='si') tabla(['Máquina','Motivo','Desde cuándo'],gtbl('t-emp-fs')); else campo('','','no','No hay máquinas fuera de servicio');
    titulo('Exportaciones',2); if(gsino('emp_exp')==='si'){ tabla(['Referencia','Lote','Destino'],gtbl('t-emp-exp')); await fotos(gfgrid('empaque','emp_exp')); } else campo('','','no','No salieron exportaciones durante el turno');
    titulo('Producto en tolvas >2 días',2); if(gsino('emp_tolvas')==='si') tabla(['Producto','Tolva','Fecha producción','Días almacenados'],gtbl('t-emp-tolvas')); else campo('','','no','No hay producto con más de 2 días en tolvas');
    titulo('Producto no conforme (PNC)',2); if(gsino('emp_pnc')==='si'){ tabla(['Producto','Área','Causa','Cantidad'],gtbl('t-emp-pnc')); await fotos(gfgrid('empaque','emp_pnc')); } else campo('','','no','No se generó producto no conforme');
    titulo('Láminas no conformes',2); if(gsino('emp_laminas')==='si'){ tabla(['Referencia','Tipo de NC','Cantidad'],gtbl('t-emp-laminas')); await fotos(gfgrid('empaque','emp_laminas')); } else campo('','','no','No salieron láminas no conformes');
    campo('Novedades con fechas de empaque — acción tomada', gv('emp_fechas_accion'), gsino('emp_fechas'), 'No se presentaron novedades con fechas de empaque');
    if(gsino('emp_fechas')==='si') await fotos(gfgrid('empaque','emp_fechas'));
    campo('Cambio / Autorización especial de producto', gv('emp_cambios_cual'), gsino('emp_cambios'), 'No hubo cambios ni autorizaciones especiales');
    if(gsino('emp_cambios')==='si') await fotos(gfgrid('empaque','emp_cambios'));
    titulo('Liberación de sticker',2);
    if(gsino('emp_sticker')==='si'){
      tabla(['Referencia','Lote','Cliente','Motivo'],gtbl('t-emp-sticker'));
      await fotos(gfgrid('empaque','emp_sticker'));
    } else campo('','','no','No se realizó liberación de sticker');
    titulo('Rayos X — RX1 y RX2',2);
    // RX1
    if(gsino('emp_rx1_op')==='no')
      campo('RX1 — fuera de operación', gv('emp_rx1_motivo'), 'no');
    else if(gsino('emp_rx1_op')==='si')
      campo('RX1 — operando', '', 'si', 'RX1 operando correctamente');
    // RX2
    if(gsino('emp_rx2_op')==='no')
      campo('RX2 — fuera de operación', gv('emp_rx2_motivo'), 'no');
    else if(gsino('emp_rx2_op')==='si')
      campo('RX2 — operando', '', 'si', 'RX2 operando correctamente');
    tabla(['Equipo','Referencia','Lote'],gtbl('t-emp-rx'));
    titulo('Desviaciones de peso',2); if(gsino('emp_peso')==='si') tabla(['Máquina','Referencia','Desviación','Acción'],gtbl('t-emp-peso')); else campo('','','no','No hubo desviaciones de peso en el turno');
    const otras = gv('emp_otras'); if(otras){ titulo('Otras novedades',2); campo('Novedades',otras); }
    await fotos(document.querySelector('.fgrid[data-fid="emp_otras_fotos"]'));

  } else if(tipoActual==='pe') {
    const inspectores = getResp('pe_general').join(', ')||'—';
    campo('Inspectores de proceso', inspectores);
    y += 3;

    // Helper: sección por línea — solo imprime si operó o si no operó con limpieza
    async function secLinPDF(num, nombre, operaKey, contenidoFn) {
      const opera = gsino(operaKey);
      check(12);
      titulo(`${num}. ${nombre}`, 1);
      if(opera === 'no') {
        const limpKey = operaKey.replace('_opera','_limp_paro');
        const limpSi  = gsino(limpKey);
        if(limpSi === 'si') {
          campo('No operó — Limpieza realizada', gv(limpKey + '_det'), 'si');
        } else {
          campo('', '', 'no', `${nombre} no operó. No se realizó limpieza.`);
        }
      } else if(opera === 'si') {
        contenidoFn();
      } else {
        campo('', '', 'no', `${nombre} — sin registro en este turno`);
      }
    }

    // Extruido: 3 líneas
    for(const n of [1,2,3]) {
      const k = `ext${n}`;
      await secLinPDF(`Extruido Línea ${n}`, `Extruido Línea ${n}`, `${k}_opera`, async () => {
        campo('Extrusor trabajado', gv(`${k}_extrusor`));
        campo('Limpieza de extrusores','',gsino(`${k}_limp_ext`));
        if(gsino(`${k}_limp_ext`)==='si') tabla(['Extrusor','Tipo limpieza','Obs'],gtbl(`t-${k}-limp`));
        const prodRows = gtbl(`t-${k}-prod`).filter(r=>r.some(v=>v?.trim()));
        if(prodRows.length){ titulo('Productos del turno',2); tabla(['Referencia','Observaciones'],prodRows); }
        campo('Ingredientes agregados','',gsino(`${k}_ingred`));
        if(gsino(`${k}_ingred`)==='si') tabla(['Ingrediente','Cantidad (kg)','Motivo'],gtbl(`t-${k}-ingred`));
        campo('Densidades conformes','',gsino(`${k}_dens`), 'Densidades dentro de parámetros');
        if(gsino(`${k}_dens`)==='no') campo('Motivo densidades', gv(`${k}_dens_mot`));
        campo('Dimensiones conformes','',gsino(`${k}_dim`), 'Dimensiones dentro de especificación');
        if(gsino(`${k}_dim`)==='no'){ campo('Motivo dimensiones', gv(`${k}_dim_mot`)); await fotos(document.querySelector(`.fgrid[data-fid="f_${k}_dim"]`)); }
        campo('PNC en la línea','',gsino(`${k}_pnc`), 'Sin producto no conforme');
        if(gsino(`${k}_pnc`)==='si') tabla(['Referencia','Causa','Cantidad','¿Qué se hizo?'],gtbl(`t-${k}-pnc`));
      });
    }

    // Rosquilla
    await secLinPDF('Rosquilla', 'Rosquilla', 'ros_opera', async () => {
      const rosRows = gtbl('t-rosquilla').filter(r=>r.some(v=>v?.trim()));
      if(rosRows.length){ titulo('Producción del turno',2); tabla(['Ref','Batches','C.Crudo','P.Final','T°Amb','T°Masa','T.Rep','Hum%','T°Cuarto','Amasadores','Horneros'],rosRows); }
      const formRows = gtbl('t-ros-form').filter(r=>r.some(v=>v?.trim()));
      if(formRows.length){ titulo('Formulación utilizada',2); tabla(['Ingrediente','Cantidad'],formRows); }
      const qProv = gv('ros_queso_prov'); const qKg = gv('ros_queso_kg');
      const qNombre = qProv==='dona-rosa'?'Doña Rosa':qProv==='colanta'?'Colanta':qProv==='mezcla'?`Mezcla: ${gv('ros_queso_mezcla_det')}`:gv('ros_queso_otro_nombre')||qProv;
      if(qNombre) campo('Queso utilizado', `${qNombre}${qKg?' — '+qKg+' kg':''}`);
      campo('Liberación de queso','',gsino('ros_queso_lib'),'Sin liberación de queso');
      if(gsino('ros_queso_lib')==='si') tabla(['Queso','Cantidad','PNC'],gtbl('t-ros-queso'));
      campo('Materia prima faltante','',gsino('ros_mp'),'Sin faltantes de materia prima');
      if(gsino('ros_mp')==='si') tabla(['MP','Impacto','Acción'],gtbl('t-ros-mp'));
      campo('Hornos', `Funcionales: ${gv('ros_hornos_func')||'—'} | En operación: ${gv('ros_hornos_op')||'—'}`);
      const novHornos = gv('ros_hornos_nov'); if(novHornos) campo('Novedades hornos', novHornos);
      await fotos(document.querySelector('.fgrid[data-fid="f_ros_hornos"]'));
      const prodConf = gsino('ros_prod_conf');
      if(prodConf==='si') campo('Estado del producto','','si','Producto salió conforme');
      else if(prodConf==='no'){
        campo('Producto no conforme — Acción tomada', gv('ros_nc_accion'), 'no');
        const logro = gsino('ros_nc_logro');
        if(logro==='no') tabla(['Referencia','Causa','Cantidad','¿Qué se hizo?'],gtbl('t-ros-pnc'));
      }
      campo('Parámetros conformes','',gsino('ros_params'),'Parámetros dentro de especificación');
      if(gsino('ros_params')==='no'){ campo('Parámetros no conformes', gv('ros_params_det')); await fotos(document.querySelector('.fgrid[data-fid="f_ros_params"]')); }
    });

    // Líneas flexibles: Tortilla, Trocillo, Pellet
    for(const [id, nombre, n] of [['linea-tort','Tortilla','Línea Tortilla'],['linea-troc','Trocillo','Línea Trocillo'],['linea-pell','Pellet','Línea Pellet']]) {
      await secLinPDF(nombre, n, `${id}_opera`, async () => {
        const tipo = gv(`${id}_proceso_tipo`);
        const pell = gv(`${id}_proceso_pellet`);
        if(tipo === 'principal') {
          if(id === 'linea-tort') {
            const tortRows = gtbl('t-tort-prod').filter(r=>r.some(v=>v?.trim()));
            if(tortRows.length){ titulo('Referencias producidas',2); tabla(['Referencia','% Sabor.','Obs'],tortRows); }
            campo('Tiempos de reposo','',gsino('tort_reposo'),'Tiempos de reposo cumplidos');
            if(gsino('tort_reposo')==='no') tabla(['Ref','T.Real','T.Req','Motivo'],gtbl('t-tort-reposo'));
            // Maíz
            const maizEst = gv('tort_maiz_estado');
            if(maizEst && maizEst !== 'nada') {
              titulo('Maíz procesado en el turno',2);
              if(maizEst.includes('reposo')){ campo('Maíz en reposo procesado',''); tabla(['Tanque','Cantidad (kg)','T.Reposo','Obs'],gtbl('t-tort-maiz-rep')); }
              if(maizEst.includes('cocinar')){ campo('Nuevos tanques puestos a cocinar',''); tabla(['Tanque','Cantidad (kg)','Hora inicio','Obs'],gtbl('t-tort-maiz-coc')); }
            } else if(maizEst === 'nada') {
              campo('','','no','No se procesó maíz en este turno');
            }
            campo('Selección PNC — horno y freedor', gv('tort_sel_si_det')||gv('tort_sel_no_det'), gsino('tort_sel'), 'No se garantizó selección de PNC');
            await fotos(document.querySelector('.fgrid[data-fid="f_tort_sel"]'));
            campo('PNC','',gsino('tort_pnc'),'Sin producto no conforme');
            if(gsino('tort_pnc')==='si'){ tabla(['Ref','Causa','Cantidad','¿Qué se hizo?'],gtbl('t-tort-pnc')); await fotos(document.querySelector('.fgrid[data-fid="f_tort_pnc"]')); }
          } else if(id === 'linea-troc') {
            const trocRows = gtbl('t-trocillo').filter(r=>r.some(v=>v?.trim()));
            if(trocRows.length){ titulo('Producción',2); tabla(['Ref','P.Crudo','P.Freído','T.Reposo','T.Freído','Resp'],trocRows); }
            campo('Tipo de aceite', gv('troc_aceite'));
            campo('Exportación','',gsino('troc_exp'),'Sin exportación en el turno');
            if(gsino('troc_exp')==='si') tabla(['Ref','Lote','Destino'],gtbl('t-troc-exp'));
            campo('Dimensiones conformes','',gsino('troc_dim'),'Dimensiones dentro de especificación');
            if(gsino('troc_dim')==='no'){ campo('Motivo', gv('troc_dim_mot')); await fotos(document.querySelector('.fgrid[data-fid="f_troc_dim"]')); }
            campo('Densidades conformes','',gsino('troc_dens'),'Densidades dentro de parámetros');
            if(gsino('troc_dens')==='no') tabla(['Ref','Densidad','Parámetro','Causa'],gtbl('t-troc-dens'));
            titulo('Dimensiones antes reposo',2); tabla(['Var','M1','M2','M3','M4','M5'],gtbl('t-troc-antes'));
            titulo('Dimensiones después freído',2); tabla(['Var','M1','M2','M3','M4','M5'],gtbl('t-troc-despues'));
          } else {
            campo('Tipo de aceite', gv('pell_aceite'));
            campo('Limpieza', gv('pell_limp_det'));
            campo('Temp >180°C','',gsino('pell_temp'),'Temperaturas dentro de parámetros');
            if(gsino('pell_temp')==='si') tabla(['Ref','T°','Hora','Acción'],gtbl('t-pell-temp'));
            campo('PNC','',gsino('pell_pnc'),'Sin producto no conforme');
            if(gsino('pell_pnc')==='si') tabla(['Ref','Causa','Cant','¿Qué se hizo?'],gtbl('t-pell-pnc'));
            const pellRows = gtbl('t-pellet').filter(r=>r.some(v=>v?.trim()));
            if(pellRows.length){ titulo('Registro',2); tabla(['Ref','%Sab','T°','¿Cumple?','Obs'],pellRows); }
          }
        } else if(tipo === 'pellet' && pell) {
          campo(`Pellet procesado: ${pell}`, '');
          const pr = gtbl(`t-${id}-pell-prod`).filter(r=>r.some(v=>v?.trim()));
          if(pr.length){ titulo('Producción',2); tabla(['Ref','%Sab','Obs'],pr); }
          campo('Temp >180°C','',gsino(`${id}_pell_temp`),'Temperaturas dentro de parámetros');
          campo('Densidades','',gsino(`${id}_pell_dens`),'Densidades dentro de parámetros');
          campo('PNC','',gsino(`${id}_pell_pnc`),'Sin producto no conforme');
          if(gsino(`${id}_pell_pnc`)==='si') tabla(['Ref','Causa','Cant','¿Qué se hizo?'],gtbl(`t-${id}-pell-pnc`));
          await fotos(document.querySelector(`.fgrid[data-fid="f_${id}_pell"]`));
        }
      });
    }

    // ── PAPA UNIFICADO ──
    check(12); titulo('Papa — PC4, PC6 y DAF',1);
    campo('Responsables', getResp('papa_general').join(', ')||'—');
    campo('Lavador operando', gv('lav_motivo'), gsino('lav_opera'), 'Lavador operando');
    if(gsino('lav_opera')==='si'){ const lavL=gv('lav_lineas'); if(lavL) campo('Lavador alimenta líneas', lavL.toUpperCase().replace(/,/g,', ')); }
    const tiposPapa = gv('papa_tipos');
    if(tiposPapa) {
      tiposPapa.split(',').forEach(t => {
        const prov = gv('papa_prov_'+t);
        campo(`Papa ${t.charAt(0).toUpperCase()+t.slice(1)}`, prov?`Proveedor: ${prov}`:'Sin proveedor registrado');
      });
    }
    campo('Temperatura cuarto de papa', gv('cuarto_papa_temp')+'°C  Humedad: '+gv('cuarto_papa_hum')+'%');
    await fotos(document.querySelector('.fgrid[data-fid="f_cuarto_papa"]'));

    for(const linea of ['pc4','pc6','daf']) {
      const L = linea.toUpperCase();
      const opera = gsino(linea+'_opera');
      titulo(`Línea ${L}`,2);
      if(opera === 'no') {
        const limpSi = gsino(linea+'_limp_paro');
        if(limpSi==='si') campo(`${L} no operó — Limpieza`, gv(linea+'_limp_paro_det'),'si');
        else campo('', gv(linea+'_manejo_actual')||`${L} no operó, sin limpieza`, 'no');
      } else if(opera === 'si') {
        const alim = gv(linea+'_alimentacion');
        campo('Alimentación', alim==='lavador'?'Lavador':'Manual');
        if(alim==='manual'){ campo('Lote papa', gv(linea+'_lote')); campo('Referencia papa', gv(linea+'_ref_manual')); }
        campo('Referencia trabajada', gv(linea+'_referencia'));
        const sabores = gv(linea+'_sabores'); if(sabores) campo('Sabores', sabores);
        const selFria = gv(linea+'_sel_fria'); const selCal = gv(linea+'_sel_caliente');
        if(selFria||selCal){ campo('Selección NC — Papa fría', selFria); campo('Selección NC — Papa caliente', selCal); }
        campo('Personal de selección', gv(linea+'_sel_personal'));
        await fotos(document.querySelector(`.fgrid[data-fid="f_${linea}_sel"]`));
        const tambRows = gtbl('t-'+linea+'-tambores').filter(r=>r.some(v=>v?.trim()));
        if(tambRows.length){ tabla(['# Tambor','Tipo','Resp. Calidad','Resp. Mtto'],tambRows); }
        campo('Limpieza de tanque','',gsino(linea+'_limp_tanque'),'Sin limpieza de tanque');
        if(gsino(linea+'_limp_tanque')==='si') await fotos(document.querySelector(`.fgrid[data-fid="f_${linea}_tanque"]`));
        campo('Limpieza saborizador/bombo','',gsino(linea+'_limp_sabor'),'Sin limpieza de saborizador/bombo');
        if(gsino(linea+'_limp_sabor')==='si') campo('Detalle', gv(linea+'_limp_sabor_det'));
        campo('Reproceso papa','',gsino(linea+'_reproc'),'Sin reproceso de papa');
        if(gsino(linea+'_reproc')==='si'){ campo('Motivo', gv(linea+'_reproc_motivo')); campo('Tipo', gv(linea+'_reproc_tipo')); }
        campo('Grasa', gv(linea+'_grasa_tipo')); campo('Aceite', gv(linea+'_aceite_tipo'));
        const nov = gv(linea+'_novedades'); if(nov) campo('Otras novedades', nov);
        await fotos(document.querySelector(`.fgrid[data-fid="f_${linea}_novedades"]`));
      } else {
        campo('','','no',`${L} — sin registro en este turno`);
      }
    }

  } else {
    titulo('Recepción de Materia Prima');
    campo('Responsables', getResp('mp').join(', ')||'—');

    titulo('Papa',2);
    if(gsino('mp_papa')==='si'){
      tabla(['Referencia','Proveedor','Aceptabilidad'],gtbl('t-mp-papa'));
      const obsPapa = gv('mp_papa_obs'); if(obsPapa) campo('Observaciones', obsPapa);
      await fotos(document.querySelector('.fgrid[data-fid="f_mp_papa"]'));
    } else campo('','','no','No llegó papa en este turno');

    titulo('Queso',2);
    if(gsino('mp_queso')==='si'){
      tabla(['Proveedor','Peso (kg)','PNC'],gtbl('t-mp-queso'));
      const obsQueso = gv('mp_queso_obs'); if(obsQueso) campo('Observaciones', obsQueso);
      await fotos(document.querySelector('.fgrid[data-fid="f_mp_queso"]'));
    } else campo('','','no','No llegó queso en este turno');

    titulo('Plátano',2);
    if(gsino('mp_platano')==='si'){
      campo('Referencia', gv('mp_platano_ref'));
      campo('Proveedor', gv('mp_platano_prov'));
      const trans = gsino('mp_platano_trans');
      if(trans==='si') campo('Condiciones de transporte','','si','Condiciones conformes');
      else if(trans==='no') campo('Condiciones de transporte — No conforme', gv('mp_platano_trans_det'), 'no');
      const obsPla = gv('mp_platano_obs'); if(obsPla) campo('Observaciones', obsPla);
      await fotos(document.querySelector('.fgrid[data-fid="f_mp_platano"]'));
    } else campo('','','no','No llegó plátano en este turno');

    titulo('Láminas',2);
    if(gsino('mp_laminas')==='si')
      tabla(['Referencia','Proveedor','Lote','Observación'],gtbl('t-mp-laminas'));
    else campo('','','no','No llegaron láminas en este turno');

    titulo('Láminas no conformes en recepción',2);
    if(gsino('mp_laminas_nc')==='si'){
      tabla(['Referencia','Proveedor','Motivo'],gtbl('t-mp-laminas-nc'));
      await fotos(document.querySelector('.fgrid[data-fid="f_mp_laminas_nc"]'));
    } else campo('','','no','No se identificaron láminas no conformes');

    titulo('Maíz',2);
    if(gsino('mp_maiz')==='si'){
      tabla(['Cuánto llegó (kg)','Lote','Proveedor','Observación'],gtbl('t-mp-maiz'));
      await fotos(document.querySelector('.fgrid[data-fid="f_mp_maiz"]'));
    } else campo('','','no','No llegó maíz en este turno');

    titulo('Otras recepciones',2);
    tabla(['Producto','Lote','Fecha vencimiento','Observación'],gtbl('t-mp-otras'));
    await fotos(document.querySelector('.fgrid[data-fid="f_mp_otras"]'));

    titulo('Reporte de fechas cortas en bodega',2);
    tabla(['Materia prima','Lote','Fecha de vencimiento'],gtbl('t-mp-fechas'));
  }

  pie();
  // Filename: INFORME EMPAQUE T1 233.pdf  (semana+dia sin separador)
  const sdCode = String(semana).padStart(2,'0') + diaNum;
  const turnoVal = gv('turno')||'0';
  let fn;
  if(tipoActual==='emp') {
    fn = `INFORME EMPAQUE T${turnoVal} ${sdCode}.pdf`;
  } else if(tipoActual==='pe') {
    fn = `INFORME PROCESOS T${turnoVal} ${sdCode}.pdf`;
  } else {
    fn = `INFORME MATERIA PRIMA ${sdCode}.pdf`;
  }
  // ── MODO CONSOLIDADO: acumular como ArrayBuffer, fusionar con pdf-lib ──
  if(window._pdfConsolidado) {
    const bytes = doc.output('arraybuffer');
    if(!window._pdfDocAcum) {
      // Primera llamada (Empaque): guardar bytes
      window._pdfDocAcum = bytes;
    } else {
      // Segunda llamada (Procesos): fusionar con pdf-lib y descargar
      const { PDFDocument } = window.PDFLib;
      try {
        const merged = await PDFDocument.create();
        // Portada consolidada — primera página del PDF fusionado
        const empPdf = await PDFDocument.load(window._pdfDocAcum);
        const pePdf  = await PDFDocument.load(bytes);
        // Copiar todas las páginas de Empaque
        const empPages = await merged.copyPages(empPdf, empPdf.getPageIndices());
        empPages.forEach(p => merged.addPage(p));
        // Copiar todas las páginas de Procesos
        const pePages = await merged.copyPages(pePdf, pePdf.getPageIndices());
        pePages.forEach(p => merged.addPage(p));
        // Descargar
        const mergedBytes = await merged.save();
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const sdCodeC = String(semana).padStart(2,'0') + diaNum;
        const turnoC  = gv('turno')||'0';
        a.href = url;
        a.download = `INFORME CONSOLIDADO T${turnoC} ${sdCodeC}.pdf`;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast('✓ PDF Consolidado generado', 'verde');
      } catch(e) {
        console.error('pdf-lib merge error:', e);
        toast('⚠️ Error al fusionar PDFs', 'rojo');
      }
      window._pdfDocAcum = null;
      window._pdfConsolidado = false;
    }
    return;
  }
  doc.save(fn);
  toast('✓ PDF generado', 'verde');
}

/* ══════ FINALIZAR INFORME ══════ */
function actualizarBtnFinalizar() {
  const btn = document.getElementById('btn-finalizar');
  if(!btn) return;
  if(estadoActual === 'finalizado') {
    btn.textContent = '🔒 Finalizado — Reabrir';
    btn.classList.add('finalizado');
    btn.disabled = false; // allow reopen
    btn.onclick = reabrirInforme;
  } else {
    btn.textContent = '✔ Finalizar';
    btn.classList.remove('finalizado');
    btn.disabled = false;
    btn.onclick = finalizarInforme;
  }
}

async function reabrirInforme() {
  if(!confirm('¿Reabrir este informe para hacer cambios? El estado volverá a "En construcción" y el PDF consolidado no estará disponible hasta que vuelva a finalizarlo.')) return;
  estadoActual = 'construccion';
  await guardarNube();
  actualizarBtnFinalizar();
  toast('↩ Informe reabierto — en construcción', '');
  renderTurnos();
}

async function finalizarInforme() {
  const err = validar();
  if(err.length) { mostrarModal(err); return; }
  if(!confirm('¿Marcar este informe como FINALIZADO? Esta acción confirma que el área está completa para el turno.')) return;
  estadoActual = 'finalizado';
  await guardarNube();
  actualizarBtnFinalizar();
  toast('✓ Informe finalizado', 'verde');
  renderTurnos(); // refresh turno status in menu (if visible)
}

async function reabrirDesdeMenu(borradorId_) {
  if(!confirm('¿Reabrir este informe para hacer cambios? Quedará como "En construcción" hasta que lo finalice nuevamente.')) return;
  if(!window._fb) { toast('Sin conexión','rojo'); return; }
  const datos = await window._fb.cargar(borradorId_);
  if(!datos) { toast('No se pudo cargar el informe','rojo'); return; }
  datos.estado = 'construccion';
  await window._fb.guardar(borradorId_, datos);
  toast('↩ Informe reabierto', '');
  renderTurnos();
}

/* ══════ TURNOS: estado consolidado ══════ */
async function renderTurnos() {
  const el = document.getElementById('turnos-list');
  if(!el) return;
  if(!window._fb) { el.innerHTML='<div style="text-align:center;padding:12px;color:var(--txt-s);font-size:13px">Conectando...</div>'; return; }
  const lista = await window._fb.listar();
  const LIMITE_MS = 12*60*60*1000;
  const ahora = Date.now();
  // Group by fecha+turno, only vigentes
  const grupos = {};
  lista.forEach(d => {
    const tc = d.createdAt || d.ts || 0;
    if(tc && (ahora-tc) > LIMITE_MS) return;
    if(d.tipo !== 'emp' && d.tipo !== 'pe') return; // only emp+pe
    const key = (d.fecha||'sin-fecha') + '_T' + (d.turno||'?');
    if(!grupos[key]) grupos[key] = { fecha: d.fecha||'—', turno: d.turno||'—', emp:null, pe:null };
    grupos[key][d.tipo] = d;
  });
  const keys = Object.keys(grupos).sort().reverse();
  if(!keys.length) {
    el.innerHTML='<div style="text-align:center;padding:12px;color:var(--txt-s);font-size:12px">No hay informes activos del turno</div>';
    return;
  }
  el.innerHTML = keys.map(key => {
    const g = grupos[key];
    const empE = g.emp?.estado || 'pendiente';
    const peE  = g.pe?.estado  || 'pendiente';
    const ambosListo = empE === 'finalizado' && peE === 'finalizado';
    function badge(tipo, estado, bId) {
      const icon = tipo==='emp'?'📦':'⚙️';
      const label = tipo==='emp'?'Empaque':'Procesos';
      const cls = estado==='finalizado'?'finalizado':estado==='construccion'?'construccion':'pendiente';
      const dot = estado==='finalizado'?'dot-fin':estado==='construccion'?'dot-const':'dot-pend';
      const txt = estado==='finalizado'?'Finalizado':estado==='construccion'?'En construcción':'Pendiente';
      const reopenBtn = (estado==='finalizado' && bId)
        ? `<button onclick="reabrirDesdeMenu('${bId}')" style="margin-left:8px;font-size:10px;padding:2px 8px;border-radius:20px;border:1px solid var(--naranja);background:var(--naranja-cl);color:var(--naranja);cursor:pointer;font-family:'DM Sans',sans-serif">↩ Reabrir</button>`
        : '';
      return `<div class="area-badge ${cls}"><span class="badge-dot ${dot}"></span>${icon} ${label}: ${txt}${reopenBtn}</div>`;
    }
    return `<div class="turno-card">
      <div class="turno-header">
        <span class="turno-id">📅 ${g.fecha} — Turno ${g.turno}</span>
        <button class="btn-consolidar" ${ambosListo?'':'disabled'}
          onclick="generarPDFConsolidado('${g.emp?.id||''}','${g.pe?.id||''}')">
          ${ambosListo?'📄 Generar PDF Consolidado':'⏳ Esperando áreas...'}
        </button>
      </div>
      <div class="turno-areas">
        ${badge('emp', empE, g.emp?.id||'')}
        ${badge('pe', peE, g.pe?.id||'')}
      </div>
    </div>`;
  }).join('');
}

async function generarPDFConsolidado(empId, peId) {
  if(!empId || !peId) { toast('Faltan datos de algún informe','rojo'); return; }
  toast('⏳ Cargando informes...');
  const dEmp = empId ? await window._fb.cargar(empId) : null;
  const dPe  = peId  ? await window._fb.cargar(peId)  : null;
  if(!dEmp || !dPe) { toast('No se pudieron cargar los informes','rojo'); return; }
  toast('⏳ Generando PDF consolidado...');
  // Save current state
  const tipoOrig = tipoActual, bidOrig = borradorId, estadoOrig = estadoActual;
  const origHTML = document.getElementById('form-content').innerHTML;
  // Generate Empaque PDF pages
  tipoActual = 'emp'; borradorId = empId; estadoActual = 'finalizado';
  renderEmpaque();
  await new Promise(r => setTimeout(r, 150));
  restaurarDatos(dEmp);
  await new Promise(r => setTimeout(r, 150));
  // Generate Procesos PDF pages
  // We call generarPDF twice but intercept save to combine
  // Actually: use a flag to tell generarPDF to return doc instead of saving
  window._pdfConsolidado = true;
  window._pdfDocAcum = null;
  await generarPDF(); // generates emp pages, stores in window._pdfDocAcum
  tipoActual = 'pe'; borradorId = peId;
  renderPE(); renderTabs();
  await new Promise(r => setTimeout(r, 150));
  restaurarDatos(dPe);
  await new Promise(r => setTimeout(r, 200));
  await generarPDF(); // appends pe pages
  window._pdfConsolidado = false;
  // Restore
  tipoActual = tipoOrig; borradorId = bidOrig; estadoActual = estadoOrig;
  document.getElementById('form-content').innerHTML = origHTML;
}


/* ══════ ADMINISTRACIÓN ══════ */
const ADMIN_PIN = '1234'; // Cambiar este PIN en el código si desea mayor seguridad

let _personasLocal = null; // se carga desde Firebase al iniciar

// Cargar personas personalizadas desde Firebase (si existen)
async function cargarPersonasConfig() {
  if(!window._fb) return;
  try {
    const d = await window._fb.cargar('__config__personas__');
    if(d && d.lista && Array.isArray(d.lista) && d.lista.length > 0) {
      _personasLocal = d.lista;
      // Update all PERSONAS_AREA entries
      Object.keys(PERSONAS_AREA).forEach(k => { PERSONAS_AREA[k] = _personasLocal; });
      console.log('Personas cargadas desde config:', _personasLocal.length);
    }
  } catch(e) {}
}

async function guardarPersonasConfig(lista) {
  if(!window._fb) { toast('Sin conexión','rojo'); return false; }
  try {
    await window._fb.guardar('__config__personas__', { lista, tipo: '__config__', ts: Date.now() });
    _personasLocal = lista;
    Object.keys(PERSONAS_AREA).forEach(k => { PERSONAS_AREA[k] = lista; });
    return true;
  } catch(e) { console.error(e); return false; }
}

function abrirAdmin() {
  // Show PIN prompt
  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.id = 'admin-overlay';
  overlay.innerHTML = `<div class="admin-box">
    <div class="admin-header">
      <h3>⚙️ Administración</h3>
      <button class="admin-close" onclick="document.getElementById('admin-overlay').remove()">×</button>
    </div>
    <div class="pin-box">
      <h3>Acceso restringido</h3>
      <p>Ingrese el PIN de administrador para continuar</p>
      <input class="pin-input" id="admin-pin-input" type="password" maxlength="6" placeholder="····"
        oninput="this.value=this.value.replace(/[^0-9]/,'')"
        onkeydown="if(event.key==='Enter') verificarPin()">
      <div class="pin-error" id="pin-error">PIN incorrecto. Intente de nuevo.</div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="modal-btn" onclick="verificarPin()" style="background:var(--azul)">Ingresar</button>
        <button class="modal-btn" onclick="document.getElementById('admin-overlay').remove()" style="background:var(--gris-m);color:var(--txt)">Cancelar</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('admin-pin-input')?.focus(), 100);
}

function verificarPin() {
  const pin = document.getElementById('admin-pin-input')?.value;
  if(pin === (window._adminPinActual || ADMIN_PIN)) {
    document.getElementById('admin-overlay').remove();
    mostrarPanelAdmin();
  } else {
    const err = document.getElementById('pin-error');
    if(err) { err.style.display = 'block'; setTimeout(()=>err.style.display='none',2000); }
    document.getElementById('admin-pin-input').value = '';
  }
}

function mostrarPanelAdmin() {
  const lista = _personasLocal || [...PERSONAS];
  const overlay = document.createElement('div');
  overlay.className = 'admin-overlay';
  overlay.id = 'admin-panel';

  function renderLista(arr) {
    return arr.map((p,i) => `<div class="persona-item" id="p-item-${i}">
      <span class="persona-name">${p}</span>
      <button class="btn-del-persona" onclick="eliminarPersona(${i})" title="Eliminar">×</button>
    </div>`).join('') || '<div style="color:var(--txt-s);font-size:13px;padding:8px">No hay responsables configurados</div>';
  }

  overlay.innerHTML = `<div class="admin-box">
    <div class="admin-header">
      <h3>⚙️ Administración — Responsables</h3>
      <button class="admin-close" onclick="document.getElementById('admin-panel').remove()">×</button>
    </div>
    <div class="admin-body">
      <div class="admin-section">
        <div class="admin-section-title">Lista de responsables</div>
        <div id="personas-lista">${renderLista(lista)}</div>
        <div class="admin-add-row">
          <input type="text" id="nueva-persona-inp" placeholder="Nombre completo del responsable"
            onkeydown="if(event.key==='Enter') agregarPersonaAdmin()">
          <button class="btn-admin-add" onclick="agregarPersonaAdmin()">+ Agregar</button>
        </div>
      </div>
      <div class="admin-section">
        <div class="admin-section-title">Cambiar PIN de administrador</div>
        <div class="grid2">
          <div><label style="font-size:12px;color:var(--txt-s)">PIN actual</label>
            <input type="password" id="pin-actual" class="rinp" placeholder="PIN actual" maxlength="6"></div>
          <div><label style="font-size:12px;color:var(--txt-s)">PIN nuevo</label>
            <input type="password" id="pin-nuevo" class="rinp" placeholder="Nuevo PIN (4-6 dígitos)" maxlength="6"></div>
        </div>
        <button class="btn-admin-add" style="margin-top:8px" onclick="cambiarPin()">Cambiar PIN</button>
        <div id="pin-change-msg" style="font-size:12px;margin-top:6px;display:none"></div>
      </div>
    </div>
    <div class="admin-footer">
      <button class="modal-btn" style="background:var(--gris-m);color:var(--txt)"
        onclick="document.getElementById('admin-panel').remove()">Cancelar</button>
      <button class="btn-admin-save" onclick="guardarCambiosAdmin()">💾 Guardar cambios</button>
    </div>
  </div>`;

  // Store working copy
  overlay._lista = [...lista];
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('nueva-persona-inp')?.focus(), 100);
}

function getAdminLista() {
  const panel = document.getElementById('admin-panel');
  return panel ? panel._lista : [];
}

function renderAdminLista() {
  const lista = getAdminLista();
  document.getElementById('personas-lista').innerHTML =
    lista.map((p,i) => `<div class="persona-item">
      <span class="persona-name">${p}</span>
      <button class="btn-del-persona" onclick="eliminarPersona(${i})">×</button>
    </div>`).join('') ||
    '<div style="color:var(--txt-s);font-size:13px;padding:8px">No hay responsables configurados</div>';
}

function agregarPersonaAdmin() {
  const inp = document.getElementById('nueva-persona-inp');
  const nombre = inp?.value?.trim();
  if(!nombre) return;
  const lista = getAdminLista();
  if(lista.includes(nombre)) { toast('Ya existe ese responsable','rojo'); return; }
  lista.push(nombre);
  document.getElementById('admin-panel')._lista = lista;
  renderAdminLista();
  inp.value = '';
  inp.focus();
}

function eliminarPersona(idx) {
  const lista = getAdminLista();
  lista.splice(idx, 1);
  document.getElementById('admin-panel')._lista = lista;
  renderAdminLista();
}

function cambiarPin() {
  const actual = document.getElementById('pin-actual')?.value;
  const nuevo  = document.getElementById('pin-nuevo')?.value;
  const msg    = document.getElementById('pin-change-msg');
  if(actual !== ADMIN_PIN) {
    msg.textContent = '❌ PIN actual incorrecto'; msg.style.color='var(--rojo)'; msg.style.display='block';
    return;
  }
  if(!nuevo || nuevo.length < 4) {
    msg.textContent = '❌ El PIN nuevo debe tener al menos 4 dígitos'; msg.style.color='var(--rojo)'; msg.style.display='block';
    return;
  }
  // Guardar nuevo PIN en Firebase
  if(window._fb) {
    window._fb.guardar('__config__pin__', { pin: nuevo, tipo:'__config__', ts: Date.now() });
  }
  // Update in memory (note: ADMIN_PIN is const - we use a mutable approach via config)
  window._adminPinActual = nuevo;
  msg.textContent = '✓ PIN cambiado correctamente'; msg.style.color='var(--verde)'; msg.style.display='block';
  document.getElementById('pin-actual').value = '';
  document.getElementById('pin-nuevo').value = '';
}

async function guardarCambiosAdmin() {
  const lista = getAdminLista();
  if(lista.length === 0) { toast('Agrega al menos un responsable','rojo'); return; }
  const btn = document.querySelector('.btn-admin-save');
  if(btn) btn.textContent = '⏳ Guardando...';
  const ok = await guardarPersonasConfig(lista);
  if(ok) {
    toast('✓ Responsables actualizados en la nube','verde');
    document.getElementById('admin-panel').remove();
  } else {
    toast('⚠️ Error al guardar','rojo');
    if(btn) btn.textContent = '💾 Guardar cambios';
  }
}

/* ══════ INIT ══════ */
async function initMenu() {
  await cargarPersonasConfig();
  await cargarPinConfig();
  renderBorradores();
  renderTurnos();
}

async function cargarPinConfig() {
  if(!window._fb) return;
  try {
    const d = await window._fb.cargar('__config__pin__');
    if(d && d.pin) window._adminPinActual = d.pin;
  } catch(e) {}
}

if(window._fbReady) initMenu();
else document.addEventListener('fbReady', initMenu, {once:true});
