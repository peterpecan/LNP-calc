import { sourceRecipe, calculate, validateRecipeShape, toCSV } from './calculator.js';
import { copy, makeId, createSession, validateSession, isAdjusted, updateStock, preparedRecord } from './session.js';
import { encodeSession, decodeSession, transferURL, isLoopback } from './transfer.js';
import { buildWorkbook } from './excel.js';
import { lipidLibrary, searchLipids, selectLibraryLipid } from './lipid-library.js';
import { stockFromMass, applyStockPreparation, changeStockUnit, updateStockInput } from './stocks.js';
const $ = selector => document.querySelector(selector);
const colors = Array.from({length:8},(_,i)=>`var(--lipid-${i+1})`);
const clone = value => structuredClone(value);
const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = (n, digits = 2) => Number.isFinite(n) ? n.toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits}) : '—';
let storageAvailable = true;
function read(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { storageAvailable = false; return fallback; } }
function write(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { storageAvailable = false; syncStorageCaption(); toast('Browser storage is unavailable or full. Export a JSON backup.'); return false; } }
let draft = read('lnp-studio-draft-v1', null);
let recipe = validateRecipeShape(draft) ? draft : clone(sourceRecipe);
let saved = read('lnp-studio-recipes-v1', []);
saved = Array.isArray(saved) ? saved.filter(s=>s && validateRecipeShape(s.recipe) && typeof s.id === 'string') : [];
let session = read('lnp-studio-session-v1', null);
if (!validateSession(session)) session = null;
if (session) recipe = copy(session.working);
let result, toastTimer, currentShare = null, pendingTransfer = null;
let customLipids=read('lnp-studio-lipid-library-v1',[]);
customLipids=Array.isArray(customLipids)?customLipids.filter(l=>l&&typeof l.id==='string'&&typeof l.name==='string'&&l.name.length<=200&&typeof l.mw==='number'&&Number.isFinite(l.mw)&&l.mw>0&&l.category==='Custom'):[];
let libraryTarget=null,stockTarget=null;
function safeSource(url){try{const u=new URL(url);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function referenceHTML(l){if(!l.reference)return '<span>Custom / entered MW</span>';const r=l.reference,overridden=l.mw!==''&&Math.abs(Number(l.mw)-r.mw)>1e-8,source=safeSource(r.source);return `${overridden?'<strong>MW overridden</strong>':r.average?'<strong>Average MW</strong>':'<strong>Library MW</strong>'} · ${source?`<a href="${escape(source)}" target="_blank" rel="noopener noreferrer">${escape(r.supplier)} ${escape(r.product)}</a>`:escape(r.supplier)}<span class="ref-form">${escape(r.form||'')}${overridden?' · Reference '+escape(r.mw)+' g/mol':''}</span>`;}
function equivalentText(l){try{const value=l.unit==='mg/mL'?Number(l.stock)*1000/Number(l.mw):Number(l.stock)*Number(l.mw)/1000;if(l.stock===''||!(Number(l.mw)>0)||!Number.isFinite(value))return 'Enter stock and MW to convert';return `= ${fmt(value,3)} ${l.unit==='mg/mL'?'mM':'mg/mL'}`;}catch{return '';}}
function saveSession() { write('lnp-studio-session-v1', session); }
function invalidateShare() { currentShare=null; $('#print-transfer').dataset.ready='false'; }
function editOffice() { session=null; saveSession(); invalidateShare(); }
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(()=>$('#toast').hidden=true,4500); }
function syncStorageCaption() {
  const banner=$('#storage-status'),dot=$('#storage-dot');
  dot.hidden=!storageAvailable;
  dot.setAttribute('aria-label',storageAvailable?'Draft saved in this browser':'Browser storage unavailable');
  banner.classList.toggle('has-error',!storageAvailable);
  if(!storageAvailable){
    $('.save-strip p').textContent='Browser storage unavailable · export a backup';
    if(!banner.querySelector('button')){banner.textContent='Browser storage is unavailable. ';const backup=document.createElement('button');backup.className='text-button';backup.textContent='Download working draft';backup.addEventListener('click',()=>{const entry={id:makeId(),kind:session?'prepared':'recipe',recipe:copy(recipe),...(session?{session:copy(session)}:{}),updated:new Date().toISOString()};download(JSON.stringify({format:'lnp-studio-v1',recipes:[entry]},null,2),'application/json','lnp-emergency-backup.json');});banner.append(backup);}
  }else{banner.classList.add('sr-only');banner.textContent='Working draft saved in this browser.';}
  if(!storageAvailable)banner.classList.remove('sr-only');
}
function renderForm() {
  document.querySelectorAll('[data-field]').forEach(el=>el.value=recipe[el.dataset.field] ?? '');
  $('#lipid-rows').innerHTML = recipe.lipids.map((l,i)=>`<tr data-index="${i}"><td><div class="lipid-name"><span class="lipid-dot" style="background:${colors[i%colors.length]}"></span><input data-lipid="name" value="${escape(l.name)}" title="${escape(l.name)}" aria-label="Lipid ${i+1} name" maxlength="200"></div><button class="row-tool" data-library-index="${i}" aria-label="Choose lipid ${i+1} from library">Choose from library</button></td><td><input data-lipid="ratio" type="number" min="0" step="any" value="${escape(l.ratio)}" aria-label="Lipid ${i+1} molar parts"></td><td><div class="stock-input"><input data-lipid="stock" type="number" min="0" step="any" value="${escape(l.stock)}" aria-label="Lipid ${i+1} stock concentration"><select data-lipid="unit" aria-label="Lipid ${i+1} stock unit"><option ${l.unit==='mM'?'selected':''}>mM</option><option ${l.unit==='mg/mL'?'selected':''}>mg/mL</option></select></div><span id="stock-equivalent-${i}" class="stock-equivalent"></span><button class="row-tool" data-prepare-index="${i}" aria-label="Prepare stock for lipid ${i+1} from mass and volume">From mass & volume</button><span id="stock-recipe-${i}" class="stock-equivalent"></span></td><td><input data-lipid="mw" type="number" min="0" step="any" value="${escape(l.mw)}" placeholder="Optional" aria-label="Lipid ${i+1} molecular weight in g per mol"><div class="mw-reference" id="mw-reference-${i}"></div></td><td><button class="remove-lipid" data-remove="${i}" aria-label="Remove lipid ${i+1}" ${recipe.lipids.length===1?'disabled':''}>×</button></td></tr>`).join('');
  update();
}
function update() {
  result = calculate(recipe);
  const valid = !result.errors.length;
  recipe.lipids.forEach((l,i)=>{if($(`#stock-equivalent-${i}`))$(`#stock-equivalent-${i}`).textContent=equivalentText(l);if($(`#stock-recipe-${i}`))$(`#stock-recipe-${i}`).textContent=l.stockPrep?`${l.stockPrep.massMg} mg / ${l.stockPrep.volumeMl} mL`:'';if($(`#mw-reference-${i}`))$(`#mw-reference-${i}`).innerHTML=referenceHTML(l);});
  const set = (id,value) => $(id).textContent = value;
  set('#ratio-total',Number.isFinite(result.sum)?`${fmt(result.sum,2)} total parts`:'Check ratios');
  set('#total-volume',valid?fmt(result.totalVolume,0):'—');
  set('#total-lipid',valid?`${fmt(result.totalNmol/1000,3)} µmol`:'—');
  set('#total-concentration',valid?`${fmt(Number(recipe.concentration),2)} mM`:'—');
  set('#scale-caption',valid?`${recipe.batches} ${Number(recipe.batches)===1?'batch':'batches'} × ${fmt(Number(recipe.volume),0)} µL · ${recipe.excess}% overage`:'Correct the inputs to calculate your preparation.');
  set('#result-status',valid?'Ready':'Check');$('#result-status').className='tag '+(valid?'tag-ok':'tag-danger');
  set('#ethanol-volume',valid?fmt(result.ethanol):'—');
  set('#result-total',valid?`${fmt(result.totalVolume)} µL`:'—');
  $('#pipetting-rows').innerHTML = result.rows.map((r,i)=>`<div class="pipetting-row"><span><i class="lipid-dot" style="background:${colors[i%colors.length]}"></i>${escape(r.name)}</span><strong>${valid?fmt(r.volume):'—'}${valid && r.volume>0 && r.volume<Number(recipe.minimum)?'<span class="tiny-flag" aria-label="Below pipetting threshold">△</span>':''}</strong></div>`).join('');
  $('#amount-rows').innerHTML = result.rows.map((r,i)=>`<tr><td><span class="lipid-dot" style="background:${colors[i%colors.length]}"></span>${escape(r.name)}</td><td>${valid?fmt(r.fraction*100):'—'}</td><td>${valid?fmt(r.nmol):'—'}</td><td>${valid && r.massUg!==null?fmt(r.massUg):'—'}</td><td>${valid?fmt(r.stockMM,3):'—'}</td></tr>`).join('');
  $('#composition-bar').innerHTML = result.rows.filter(r=>Number.isFinite(r.fraction)&&r.fraction>0).map(r=>`<span style="background:${colors[result.rows.indexOf(r)%colors.length]};flex:${r.fraction}"></span>`).join('');
  $('#composition-legend').innerHTML = result.rows.map((r,i)=>`<span><i class="lipid-dot" style="background:${colors[i%colors.length]}"></i>${escape(r.name)} ${Number.isFinite(r.fraction)&&r.fraction>=0?fmt(r.fraction*100)+'%':''}</span>`).join('');
  $('#messages').innerHTML = [...result.errors.map(e=>`<div class="message error"><strong>Check your inputs</strong>${escape(e)}</div>`),...(valid?result.warnings:[]).map(w=>`<div class="message"><strong>${w.includes('threshold')?'Small aliquot':w.includes('DSPC stock')?'DSPC stock to verify':'Molecular weight note'}</strong>${escape(w)}</div>`)].join('');
  ['#export-csv','#export-excel','#print-recipe','#save-recipe','#start-lab','#share-phone'].forEach(id=>$(id).disabled=!valid);
  refreshLabResults();
  write('lnp-studio-draft-v1',recipe); syncStorageCaption();
}
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.dataset.field) { editOffice(); recipe[el.dataset.field]=el.value; update(); }
  if(el.dataset.lipid && el.tagName!=='SELECT') { editOffice(); const i=Number(el.closest('tr').dataset.index);recipe.lipids[i]=updateStockInput(recipe.lipids[i],el.dataset.lipid,el.value);if(el.dataset.lipid==='mw'&&recipe.lipids[i].stockPrep&&recipe.lipids[i].unit==='mM')el.closest('tr').querySelector('[data-lipid="stock"]').value=recipe.lipids[i].stock;update(); }
});
document.addEventListener('change',event=>{
  const el=event.target;
  if(el.dataset.lipid==='unit') {
    editOffice();
    const i=Number(el.closest('tr').dataset.index);recipe.lipids[i]=changeStockUnit(recipe.lipids[i],el.value);if(recipe.lipids[i].stock==='')toast('Enter the stock concentration in the selected units.');renderForm();
  }
});
$('#lipid-rows').addEventListener('click',event=>{const button=event.target.closest('[data-remove]');if(!button||recipe.lipids.length<=1)return;editOffice();recipe.lipids.splice(Number(button.dataset.remove),1);renderForm();});
$('#add-lipid').addEventListener('click',()=>{if(recipe.lipids.length>=50)return toast('A recipe can contain up to 50 lipids.');editOffice();recipe.lipids.push({name:'New lipid',role:'Custom',ratio:0,stock:'',unit:'mg/mL',mw:''});renderForm();$('#lipid-rows tr:last-child input').focus();});
$('#load-source').addEventListener('click',()=>{if(!confirm('Replace the working draft and active session with the starter recipe? Saved records will remain.'))return;editOffice();recipe=clone(sourceRecipe);renderForm();toast('Starter recipe loaded.');});
function download(content,type,name) { const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
function filename(name) { return name.replace(/[^a-z0-9_-]/gi,'-').replace(/-+/g,'-').slice(0,80)||'lnp-recipe'; }
function csvExport(){if(result.errors.length)return;let csv=toCSV(recipe,result);if(session){csv+='\r\n\r\n"Session","'+session.id+'"\r\n"Planned at","'+session.plannedAt+'"\r\n"Prepared at","'+(session.preparedAt||'Not saved as prepared')+'"\r\n\r\n"ORIGINAL PLAN"\r\n'+toCSV(session.plan,calculate(session.plan)).replace(/^\uFEFF/,'');}download(csv,'text/csv;charset=utf-8',`${filename(recipe.name)}-pipetting.csv`);toast('Pipetting sheet exported.');}
$('#export-csv').addEventListener('click',csvExport);
$('#print-recipe').addEventListener('click',printRecipe);
$('#save-recipe').addEventListener('click',()=>{
  const name=recipe.name.trim();if(!name)return toast('Enter a recipe name before saving.');
  recipe.name=name;const existing=saved.findIndex(s=>s.kind!=='prepared'&&s.recipe.name===name);const item={id:existing>=0?saved[existing].id:makeId(),kind:'recipe',recipe:clone(recipe),updated:new Date().toISOString()};
  const next=clone(saved);if(existing>=0)next[existing]=item;else next.unshift(item);
  if(write('lnp-studio-recipes-v1',next)){saved=next;renderSaved();toast(existing>=0?'Recipe updated.':'Recipe saved in this browser.');}
  syncStorageCaption();
});
function renderSaved() {
  $('#recipe-count').textContent=saved.length;$('#backup-recipes').hidden=!saved.length;
  $('#saved-list').innerHTML=saved.length?saved.map((s,i)=>`<article class="card saved-card"><p class="eyebrow">${s.kind==='prepared'?'PREPARED RECORD':s.recipe.lipids.length+' LIPIDS'}</p><h2>${escape(s.recipe.name)}</h2><p>${fmt(Number(s.recipe.volume),0)} µL / batch · ${fmt(Number(s.recipe.concentration))} mM</p><p>${escape(s.recipe.lipids.map(l=>l.name).join(' / '))}</p><p>Saved ${escape(new Date(s.updated).toLocaleString())}</p><div class="saved-actions"><button class="button primary" data-open-recipe="${i}">${s.kind==='prepared'?'Open record':'Open recipe'}</button><button class="button secondary" data-json-recipe="${i}">Export JSON</button><button class="button secondary delete-recipe" data-delete-recipe="${i}">Delete</button></div></article>`).join(''):'<div class="empty-state"><h2>No saved recipes</h2><p>Save a recipe or prepared record to add it to your library.</p><a class="button primary" href="#calculator">Go to calculator</a></div>';
}
$('#saved-list').addEventListener('click',event=>{
  const el=event.target.closest('button');if(!el)return;
  if(el.dataset.openRecipe!==undefined){const entry=saved[Number(el.dataset.openRecipe)];if(!entry)return;if(!confirm('Load this record and replace the working draft and active session?'))return;session=validateSession(entry.session)?copy(entry.session):null;recipe=copy(session?session.working:entry.recipe);saveSession();invalidateShare();renderForm();renderLab();location.hash=session?'lab':'calculator';toast('Saved record loaded.');}
  if(el.dataset.jsonRecipe!==undefined){const entry=saved[Number(el.dataset.jsonRecipe)];download(JSON.stringify({format:'lnp-studio-v1',recipes:[entry]},null,2),'application/json',filename(entry.recipe.name)+'.json');}
  if(el.dataset.deleteRecipe!==undefined){const index=Number(el.dataset.deleteRecipe);if(!confirm(`Delete “${saved[index].recipe.name}” from this browser?`))return;const next=saved.filter((_,i)=>i!==index);if(write('lnp-studio-recipes-v1',next)){saved=next;renderSaved();toast('Recipe deleted.');}}
});
$('#backup-recipes').addEventListener('click',()=>{if(!saved.length)return toast('Save a recipe before exporting a library backup.');download(JSON.stringify({format:'lnp-studio-v1',recipes:saved},null,2),'application/json','lnp-calculator-recipes.json');toast('Recipe library exported.');});
$('#import-recipes').addEventListener('click',()=>$('#import-file').click());
$('#import-file').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(file.size>2*1024*1024)throw new Error('Choose a JSON backup smaller than 2 MB.');
    const data=JSON.parse(await file.text());
    if(data.format!=='lnp-studio-v1'||!Array.isArray(data.recipes)||!data.recipes.length||data.recipes.length>500||!data.recipes.every(s=>s&&validateRecipeShape(s.recipe)))throw new Error('This is not a valid LNP calculator recipe backup.');
    const next=clone(saved);
    for(const s of data.recipes){if(s.session!==undefined&&!validateSession(s.session))throw new Error('A prepared record has invalid session data. Nothing was imported.');const importedSession=s.session?copy(s.session):null;const r=copy(importedSession?importedSession.working:s.recipe);if(!importedSession){const names=new Set(next.map(s=>s.recipe.name));let name=r.name.trim()||'Imported recipe',n=2;const base=name;while(names.has(name))name=`${base} (${n++})`;r.name=name;}next.unshift({id:makeId(),kind:importedSession?'prepared':'recipe',recipe:r,...(importedSession?{session:importedSession}:{}),updated:new Date().toISOString()});}
    if(write('lnp-studio-recipes-v1',next)){saved=next;renderSaved();toast(`${data.recipes.length} recipe(s) imported. Existing recipes kept.`);}
  }catch(error){toast(error.message||'The backup could not be imported.');}finally{event.target.value='';}
});
function navigate(){const target=location.hash.slice(1);if(target.startsWith('transfer=')){receiveTransfer(target.slice(9));return;}const page=['calculator','lab','recipes','review','method'].includes(target)&&document.getElementById(target+'-page')?target:'calculator';document.querySelectorAll('main.page').forEach(el=>el.hidden=el.id!==`${page}-page`);document.querySelectorAll('[data-page]').forEach(el=>{el.classList.toggle('active',el.dataset.page===page);if(el.dataset.page===page)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});document.body.dataset.view=page;window.scrollTo({top:0,left:0,behavior:'instant'});const title=document.querySelector('main:not([hidden]) h1');if(title){title.tabIndex=-1;title.focus({preventScroll:true});}document.querySelector('.skip-link').onclick=event=>{event.preventDefault();title?.focus();title?.scrollIntoView({block:'start'});};if(page==='lab')renderLab();if(page==='calculator')renderForm();}

function ensureSession(){if(!session){session=createSession(recipe);saveSession();}return session;}
function startLab(){try{ensureSession();renderLab();location.hash='lab';}catch(e){toast(e.message);}}
$('#start-lab').addEventListener('click',startLab);$('#lab-create').addEventListener('click',startLab);
function renderLab(){
  $('#lab-empty').hidden=Boolean(session);$('#lab-active').hidden=!session;
  if(!session){$('#lab-session-state').textContent='No active session';return;}
  $('#lab-name').textContent=session.working.name;
  $('#lab-meta').textContent=`Planned ${new Date(session.plannedAt).toLocaleString()} · Ref ${session.id.slice(0,8)}`;
  const planResult=calculate(session.plan);
  $('#lab-targets').innerHTML=`<span><strong>${fmt(planResult.totalVolume)} µL</strong>Total lipid phase</span><span><strong>${fmt(planResult.totalNmol/1000,3)} µmol</strong>Total lipid</span><span><strong>${fmt(Number(session.plan.concentration))} mM</strong>Concentration</span>`;
  $('#lab-stock-cards').innerHTML=session.working.lipids.map((l,i)=>`<article class="card lab-stock" data-lab-index="${i}"><div class="lab-stock-heading"><label><input type="checkbox" data-checked="${i}" ${session.checked.includes(i)?'checked':''}><span class="lipid-dot" style="background:${colors[i%colors.length]}"></span>${escape(l.name)}</label><span class="pill">${fmt(planResult.rows[i].fraction*100)} mol%</span></div><div class="lab-stock-body"><div><label class="field">Stock on bench<div class="stock-input"><input type="number" min="0" step="any" data-lab="stock" value="${escape(l.stock)}" aria-label="${escape(l.name)} lab stock concentration"><select data-lab="unit" aria-label="${escape(l.name)} lab stock unit"><option ${l.unit==='mM'?'selected':''}>mM</option><option ${l.unit==='mg/mL'?'selected':''}>mg/mL</option></select></div></label><p class="planned-stock">Planned: ${escape(session.plan.lipids[i].stock)} ${escape(session.plan.lipids[i].unit)}</p></div><div class="lab-aliquot"><span>ADD TO MIXTURE</span><strong id="lab-volume-${i}">—</strong><small id="lab-delta-${i}"></small></div></div><details><summary>Molecular weight & amount</summary><label class="field">MW (g/mol)<input type="number" min="0" step="any" data-lab="mw" value="${escape(l.mw)}" placeholder="Optional for mM stocks" aria-label="${escape(l.name)} lab molecular weight"></label><p class="planned-stock" id="lab-amount-${i}"></p></details></article>`).join('');
  $('#lab-notes').value=session.working.notes||'';
  document.querySelectorAll('[data-lab-index]').forEach(card=>{const i=Number(card.dataset.labIndex);card.querySelector('.planned-stock').insertAdjacentHTML('beforebegin',`<span class="stock-equivalent" id="lab-equivalent-${i}"></span><button class="row-tool" data-lab-prepare="${i}">From mass & volume</button><span class="stock-equivalent" id="lab-stock-recipe-${i}"></span>`);card.querySelector('details').insertAdjacentHTML('beforeend',`<div class="mw-reference" id="lab-mw-reference-${i}"></div>`);});
  $('#lab-plan-rows').innerHTML=planResult.rows.map(r=>`<tr><td>${escape(r.name)}</td><td>${escape(r.stock)} ${escape(r.unit)}</td><td>${fmt(r.volume)}</td></tr>`).join('');
  refreshLabResults();
}
function refreshLabResults(){
  if(!session){if($('#lab-empty')){$('#lab-empty').hidden=false;$('#lab-active').hidden=true;$('#lab-session-state').textContent='No active session';}return;}
  const r=calculate(session.working),p=calculate(session.plan),valid=!r.errors.length;
  $('#lab-session-state').textContent=!valid?'Check':session.preparedAt?'Prepared':isAdjusted(session)?'Adjusted':'Planned';$('#lab-session-state').className='tag '+(!valid?'tag-danger':isAdjusted(session)&&!session.preparedAt?'tag-warn':'tag-ok');
  r.rows.forEach((row,i)=>{const el=$(`#lab-volume-${i}`);if(!el)return;el.textContent=valid?`${fmt(row.volume)} µL`:'—';const delta=row.volume-p.rows[i].volume;$(`#lab-delta-${i}`).textContent=valid?`${Math.abs(delta)<1e-8?'Same as plan':(delta>0?'+':'')+fmt(delta)+' µL vs plan'}`:'';$(`#lab-amount-${i}`).textContent=valid?`${fmt(row.nmol)} nmol · ${row.massUg===null?'mass needs MW':fmt(row.massUg)+' µg'}`:'';if($(`#lab-equivalent-${i}`))$(`#lab-equivalent-${i}`).textContent=equivalentText(row);if($(`#lab-stock-recipe-${i}`))$(`#lab-stock-recipe-${i}`).textContent=row.stockPrep?`${row.stockPrep.massMg} mg / ${row.stockPrep.volumeMl} mL`:'';if($(`#lab-mw-reference-${i}`))$(`#lab-mw-reference-${i}`).innerHTML=referenceHTML(row);});
  $('#lab-ethanol').textContent=valid?`${fmt(r.ethanol)} µL`:'—';$('#lab-check-ethanol').checked=session.checked.includes(r.rows.length);
  document.querySelectorAll('[data-checked]').forEach(el=>el.checked=session.checked.includes(Number(el.dataset.checked)));
  $('#lab-messages').innerHTML=[...r.errors.map(e=>`<div class="message error"><strong>Check your inputs</strong>${escape(e)}</div>`),...(valid?r.warnings:[]).map(w=>`<div class="message">${escape(w)}</div>`)].join('');
  ['#save-prepared','#lab-share','#lab-excel','#lab-csv','#lab-print'].forEach(id=>$(id).disabled=!valid);
}
$('#lab-stock-cards').addEventListener('input',event=>{const el=event.target;if(!el.dataset.lab||el.tagName==='SELECT')return;const i=Number(el.closest('[data-lab-index]').dataset.labIndex);session=updateStock(session,i,el.dataset.lab,el.value);if(el.dataset.lab==='mw'&&session.working.lipids[i].stockPrep&&session.working.lipids[i].unit==='mM')el.closest('[data-lab-index]').querySelector('[data-lab="stock"]').value=session.working.lipids[i].stock;recipe=copy(session.working);saveSession();invalidateShare();update();});
$('#lab-stock-cards').addEventListener('change',event=>{const el=event.target;if(el.dataset.lab==='unit'){const i=Number(el.closest('[data-lab-index]').dataset.labIndex),converted=changeStockUnit(session.working.lipids[i],el.value);session=updateStock(session,i,'unit',el.value);session.working.lipids[i]=converted;recipe=copy(session.working);saveSession();invalidateShare();renderForm();renderLab();}if(el.dataset.checked!==undefined){const i=Number(el.dataset.checked);session.checked=el.checked?[...new Set([...session.checked,i])]:session.checked.filter(n=>n!==i);saveSession();}});
$('#lab-check-ethanol').addEventListener('change',event=>{const i=session.working.lipids.length;session.checked=event.target.checked?[...new Set([...session.checked,i])]:session.checked.filter(n=>n!==i);saveSession();});
$('#lab-notes').addEventListener('input',event=>{session.working.notes=event.target.value;session.preparedAt=null;recipe=copy(session.working);saveSession();invalidateShare();update();});
$('#restore-stocks').addEventListener('click',()=>{if(!session||!confirm('Restore all planned stock concentrations and molecular weights? Current pipetting checks will clear.'))return;session.working.lipids=copy(session.plan.lipids);session.checked=[];session.preparedAt=null;recipe=copy(session.working);saveSession();invalidateShare();renderForm();renderLab();});
$('#save-prepared').addEventListener('click',()=>{try{const entry=preparedRecord(session);const next=[entry,...saved];if(write('lnp-studio-recipes-v1',next)){saved=next;session=copy(entry.session);saveSession();renderSaved();refreshLabResults();toast('Prepared record saved with the original plan. Future edits will not change this record.');}}catch(e){toast(e.message);}});

function shareBase(){const savedBase=read('lnp-studio-share-base-v1','');if(savedBase)return savedBase;if(location.protocol==='file:')return '';const u=new URL(location.href);u.hash='';u.search='';return u.href;}
async function makeShare(base){const token=await encodeSession(ensureSession());const url=transferURL(base,token);if(new TextEncoder().encode(url).length>2200)throw new Error('This recipe is too large for a reliable QR. Shorten the notes or use a JSON backup.');if(!globalThis.LNPVendor?.QRCode)throw new Error('QR library did not load. Reload the calculator.');const png=await LNPVendor.QRCode.toDataURL(url,{errorCorrectionLevel:'M',width:640,margin:4,color:{dark:getComputedStyle(document.documentElement).getPropertyValue('--qr-dark').trim(),light:getComputedStyle(document.documentElement).getPropertyValue('--qr-light').trim()}});return {url,png,loopback:isLoopback(base)};}
async function openShare(){try{ensureSession();$('#share-base').value=shareBase();$('#share-code').hidden=true;$('#share-feedback').hidden=true;$('#share-dialog').showModal();if($('#share-base').value)await generateQR();}catch(e){toast(e.message);}}
async function generateQR(){const btn=$('#generate-qr');btn.disabled=true;btn.textContent='Generating…';$('#share-code').hidden=true;try{const share=await makeShare($('#share-base').value.trim());currentShare=share;write('lnp-studio-share-base-v1',$('#share-base').value.trim());$('#qr-image').src=share.png;$('#share-link').value=share.url;$('#share-code').hidden=false;$('#share-feedback').hidden=!share.loopback;$('#share-feedback').textContent=share.loopback?'This address is localhost: a phone will try to open itself. Enter a reachable GitHub Pages or LAN address before scanning on a phone.':'';}catch(e){$('#share-feedback').hidden=false;$('#share-feedback').textContent=e.message||'Could not generate this QR.';}finally{btn.disabled=false;btn.textContent='Generate QR';}}
$('#share-phone').addEventListener('click',openShare);$('#lab-share').addEventListener('click',openShare);$('#generate-qr').addEventListener('click',generateQR);
$('#copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#share-link').value);toast('Recipe link copied.');}catch{$('#share-link').focus();$('#share-link').select();toast('Select and copy the recipe link.');}});
$('#download-qr').addEventListener('click',()=>{if(!currentShare)return;const link=document.createElement('a');link.href=currentShare.png;link.download=filename(recipe.name)+'-recipe-qr.png';link.click();});
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.close==='receive-dialog')cancelTransfer();else document.getElementById(btn.dataset.close).close();}));
async function receiveTransfer(token){try{pendingTransfer=await decodeSession(token);$('#receive-summary').innerHTML=`<h3>${escape(pendingTransfer.working.name)}</h3><p>${pendingTransfer.working.lipids.length} lipids · ${fmt(calculate(pendingTransfer.working).totalVolume)} µL · ${fmt(Number(pendingTransfer.working.concentration))} mM</p><p class="muted">Planned ${escape(new Date(pendingTransfer.plannedAt).toLocaleString())} · Ref ${escape(pendingTransfer.id.slice(0,8))}</p>`;if(!$('#receive-dialog').open)$('#receive-dialog').showModal();}catch(e){toast(e.message);history.replaceState(null,'',location.pathname+location.search+'#calculator');navigate();}}
function cancelTransfer(){pendingTransfer=null;$('#receive-dialog').close();history.replaceState(null,'',location.pathname+location.search+'#calculator');navigate();}
$('#receive-dialog').addEventListener('cancel',event=>{event.preventDefault();cancelTransfer();});$('#cancel-transfer').addEventListener('click',cancelTransfer);
$('#accept-transfer').addEventListener('click',()=>{if(!pendingTransfer)return;session=copy(pendingTransfer);pendingTransfer=null;recipe=copy(session.working);saveSession();invalidateShare();$('#receive-dialog').close();history.replaceState(null,'',location.pathname+location.search+'#lab');renderForm();renderLab();navigate();toast('Recipe opened. Adjust stock concentrations on this device.');});
async function exportExcel(){const btns=['#export-excel','#lab-excel'];btns.forEach(id=>$(id).disabled=true);try{const s=ensureSession();let share=null,qrNote='Set a website address to include a QR.';if(shareBase()){try{share=await makeShare(shareBase());}catch(e){qrNote='QR omitted: '+e.message;}}const workbook=buildWorkbook(LNPVendor.ExcelJS,recipe,s,share);download(await workbook.xlsx.writeBuffer(),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',filename(recipe.name)+'-preparation.xlsx');toast('Excel exported with original plan'+(share?' and recipe QR.':'. '+qrNote));}catch(e){toast(e.message||'Excel export failed.');}finally{btns.forEach(id=>$(id).disabled=Boolean(result.errors.length));}}
async function printRecipe(){if(result.errors.length)return;try{const s=ensureSession();$('#print-session').textContent=`${recipe.name} · Ref ${s.id.slice(0,8)} · Planned ${new Date(s.plannedAt).toLocaleString()}`;$('#print-qr').hidden=true;$('#print-qr-note').textContent='Set the calculator website address in Share to phone to include a QR.';if(shareBase()){try{const share=await makeShare(shareBase());$('#print-qr').src=share.png;await $('#print-qr').decode();$('#print-qr').hidden=false;$('#print-qr-note').textContent=share.loopback?'Localhost QR: enter a phone-reachable website address in Share to phone for use in the lab.':'The QR includes the original plan and current stock inputs.';}catch(e){$('#print-qr-note').textContent='QR omitted: '+e.message;}}$('#print-transfer').dataset.ready='true';window.print();}catch(e){toast(e.message);}}
$('#export-excel').addEventListener('click',exportExcel);$('#lab-excel').addEventListener('click',exportExcel);$('#lab-csv').addEventListener('click',csvExport);$('#lab-print').addEventListener('click',printRecipe);

async function registerOffline(){
  const status=$('#offline-status');
  if(location.protocol==='file:'||document.body.dataset.portable==='true'){status.textContent='Standalone offline file';return;}
  if(!('serviceWorker' in navigator)||!isSecureContext){status.textContent='Offline caching needs HTTPS';return;}
  try{const registration=await navigator.serviceWorker.register(new URL('sw.js',document.baseURI),{scope:new URL('.',document.baseURI).pathname});await navigator.serviceWorker.ready;status.textContent=navigator.onLine?'Available offline':'Offline · using cached app';navigator.serviceWorker.addEventListener('controllerchange',()=>status.textContent=navigator.onLine?'Available offline':'Offline · using cached app');window.addEventListener('online',()=>status.textContent='Available offline');window.addEventListener('offline',()=>status.textContent='Offline · using cached app');registration.update().catch(()=>{});}catch{status.textContent='Offline cache unavailable';}
}
function openLibrary(index=null){libraryTarget=index;$('#lipid-search').value='';$('#lipid-category').value='All';$('#library-target').textContent=index===null?'Adds a new row with zero molar parts. Enter its ratio and stock concentration.':`Replacing ${recipe.lipids[index].name}. Molar parts are retained; the old stock concentration is cleared.`;$('#library-dialog').showModal();renderLibrary();$('#lipid-search').focus();}
function renderLibrary(){const entries=searchLipids($('#lipid-search').value,$('#lipid-category').value,customLipids);$('#library-results').innerHTML=entries.length?entries.map(l=>`<article class="library-entry"><div><span class="pill">${escape(l.category)}</span><h3>${escape(l.name)}</h3><p>${escape(l.form)}</p><p class="library-source">${escape(l.supplier)} ${escape(l.product||'')}${safeSource(l.source)?` · <a href="${escape(safeSource(l.source))}" target="_blank" rel="noopener noreferrer">Source</a>`:''}</p></div><div class="library-pick"><strong>${escape(l.mw)} <small>g/mol${l.average?' average':''}</small></strong><button class="button secondary" data-pick-lipid="${escape(l.id)}" aria-label="Use ${escape(l.name)}">Use lipid</button></div></article>`).join(''):'<p class="storage-note">No matching lipids. You can add a custom entry below.</p>';}
function chooseLibraryEntry(entry){if(libraryTarget===null&&recipe.lipids.length>=50)return toast('A recipe can contain up to 50 lipids.');editOffice();if(libraryTarget===null){recipe.lipids.push(selectLibraryLipid({ratio:0},entry));}else recipe.lipids[libraryTarget]=selectLibraryLipid(recipe.lipids[libraryTarget],entry);$('#library-dialog').close();renderForm();toast(`${entry.name} selected. Enter the stock concentration${libraryTarget===null?' and molar parts':''}.`);}
$('#browse-library').addEventListener('click',()=>openLibrary());$('#lipid-search').addEventListener('input',renderLibrary);$('#lipid-category').addEventListener('change',renderLibrary);
$('#library-results').addEventListener('click',event=>{const btn=event.target.closest('[data-pick-lipid]');if(!btn)return;const entry=[...lipidLibrary,...customLipids].find(l=>l.id===btn.dataset.pickLipid);if(entry)chooseLibraryEntry(entry);});
$('#lipid-rows').addEventListener('click',event=>{const btn=event.target.closest('[data-library-index],[data-prepare-index]');if(!btn)return;if(btn.dataset.libraryIndex!==undefined)openLibrary(Number(btn.dataset.libraryIndex));else openStockDialog(Number(btn.dataset.prepareIndex),false);});
$('#save-custom-lipid').addEventListener('click',()=>{const name=$('#custom-lipid-name').value.trim(),mw=Number($('#custom-lipid-mw').value),source=$('#custom-lipid-source').value.trim();if(!name||!(mw>0&&Number.isFinite(mw))||source&&!safeSource(source)){$('#custom-lipid-error').hidden=false;$('#custom-lipid-error').textContent='Enter a name, a positive molecular weight, and a valid http(s) reference URL if supplied.';return;}const entry={id:'custom-'+makeId(),name,mw,category:'Custom',aliases:'',supplier:'Custom',product:'',form:$('#custom-lipid-form').value.trim(),source,average:$('#custom-lipid-average').checked};const next=[...customLipids,entry];if(write('lnp-studio-lipid-library-v1',next)){customLipids=next;$('#custom-lipid-error').hidden=true;chooseLibraryEntry(entry);}});
function stockRow(){return stockTarget?(stockTarget.lab?session.working:recipe).lipids[stockTarget.index]:null;}
function openStockDialog(index,lab){stockTarget={index,lab};const row=stockRow();$('#stock-lipid-name').textContent=`${row.name} · ${row.mw?row.mw+' g/mol':'select a lipid or enter its molecular weight'}`;$('#stock-mass').value=row.stockPrep?.massMg??100;$('#stock-final-volume').value=row.stockPrep?.volumeMl??4;$('#stock-dialog').showModal();renderStockPreview();}
function renderStockPreview(){try{const row=stockRow(),r=stockFromMass($('#stock-mass').value,$('#stock-final-volume').value,row.mw);$('#stock-preview').innerHTML=`<div><span>MASS CONCENTRATION</span><strong>${fmt(r.mgMl,3)} <small>mg/mL</small></strong></div><div><span>MOLAR CONCENTRATION</span><strong>${r.stockMM===null?'MW needed':fmt(r.stockMM,3)+' <small>mM</small>'}</strong></div>`;$('#apply-stock').disabled=false;}catch(e){$('#stock-preview').textContent=e.message;$('#apply-stock').disabled=true;}}
$('#stock-mass').addEventListener('input',renderStockPreview);$('#stock-final-volume').addEventListener('input',renderStockPreview);
$('#apply-stock').addEventListener('click',()=>{try{const row=applyStockPreparation(stockRow(),$('#stock-mass').value,$('#stock-final-volume').value),{index,lab}=stockTarget;if(lab){session=updateStock(session,index,'stock',row.stock);session.working.lipids[index]=row;recipe=copy(session.working);saveSession();invalidateShare();}else{editOffice();recipe.lipids[index]=row;}$('#stock-dialog').close();renderForm();if(lab)renderLab();toast(`Stock set to ${fmt(row.stock,3)} mg/mL.`);}catch(e){toast(e.message);}});
$('#lab-stock-cards').addEventListener('click',event=>{const btn=event.target.closest('[data-lab-prepare]');if(btn)openStockDialog(Number(btn.dataset.labPrepare),true);});
window.addEventListener('hashchange',navigate);renderForm();renderSaved();renderLab();navigate();syncStorageCaption();registerOffline();

document.querySelectorAll('[data-section]').forEach(button=>button.addEventListener('click',()=>{const section=document.getElementById(button.dataset.section);section.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});section.focus({preventScroll:true});}));
