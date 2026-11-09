'use strict';
const assets=JSON.parse(document.getElementById('asset-data').textContent);
const byId=new Map(assets.map(a=>[a.id,a]));
const selected=new Set();
const cards=[...document.querySelectorAll('article[data-id]')];
const q=document.getElementById('q'),statusFilter=document.getElementById('status'),lang=document.getElementById('lang'),category=document.getElementById('category');
const formatBoxes=[...document.querySelectorAll('#formats input')];
const count=document.getElementById('selected-count'),downloadStatus=document.getElementById('download-status'),downloadButton=document.getElementById('download-selection');
let busy=false;
function selectedFiles(){
 const formats=formatBoxes.filter(x=>x.checked).map(x=>x.value), files=new Set();let editable=false;
 for(const id of selected){const a=byId.get(id);for(const f of formats){if(f==='editable'){if(a.editable){files.add('09-editable/'+a.path+'.svg');editable=true;}}else if(a.formats.includes(f))files.add(a.path+'.'+f);}}
 if(editable)for(const f of ['Manrope.ttf','Manrope-OFL.txt','CormorantGaramond.ttf','CormorantGaramond-OFL.txt'])files.add('08-fonts/'+f);
 return [...files];
}
function update(){
 for(const c of cards){const on=selected.has(c.dataset.id);c.classList.toggle('is-selected',on);c.querySelector('.pick-box').checked=on;}
 const n=selectedFiles().length;
 count.textContent=selected.size?`Выбрано элементов: ${selected.size} · файлов: ${n}`:'Ничего не выбрано';
 downloadButton.disabled=busy||!n;
 document.getElementById('clear-selection').disabled=busy||!selected.size;
 if(!busy)downloadStatus.textContent=!selected.size?'Отметьте нужные элементы в каталоге.':!n?'Для этих элементов нет выбранных форматов. Выберите другой формат.':'ZIP сохранит названия файлов и структуру папок. Инструкция будет приложена.';
}
function filter(){
 const term=q.value.trim().toLocaleLowerCase('ru');
 for(const a of cards)a.hidden=!((!statusFilter.value||a.dataset.status===statusFilter.value)&&(!lang.value||a.dataset.lang===lang.value||!a.dataset.lang)&&(!category.value||a.dataset.category===category.value)&&(!term||a.dataset.search.toLocaleLowerCase('ru').includes(term)));
 document.querySelectorAll('main section').forEach(s=>s.hidden=![...s.querySelectorAll('article')].some(a=>!a.hidden));
 const visible=cards.filter(a=>!a.hidden).length;document.getElementById('count').textContent=`Показано: ${visible} из ${cards.length}`;
 document.getElementById('select-visible').disabled=busy||!visible;
}
for(const f of [q,statusFilter,lang,category])f.addEventListener('input',filter);
for(const c of cards)c.querySelector('.pick-box').addEventListener('change',e=>{if(e.target.checked)selected.add(c.dataset.id);else selected.delete(c.dataset.id);update();});
formatBoxes.forEach(x=>x.addEventListener('change',update));
document.getElementById('select-visible').addEventListener('click',()=>{cards.filter(x=>!x.hidden).forEach(x=>selected.add(x.dataset.id));update();});
document.getElementById('clear-selection').addEventListener('click',()=>{selected.clear();update();});
function lock(state){busy=state;document.querySelectorAll('.pick-box,#formats input,#select-visible,#clear-selection').forEach(x=>x.disabled=state);update();filter();}
downloadButton.addEventListener('click',async()=>{
 if(busy)return;
 const paths=selectedFiles();if(!paths.length)return;
 if(!window.JSZip){downloadStatus.textContent='Не удалось загрузить ZIP-модуль. Обновите страницу или скачайте файлы по отдельным ссылкам.';return;}
 lock(true);let success=false;
 try{
  const zip=new JSZip();let cursor=0,done=0;
  const tasks=[...paths,'README.txt'];
  await Promise.all(Array.from({length:Math.min(4,tasks.length)},async()=>{while(cursor<tasks.length){const path=tasks[cursor++];const response=await fetch(path);if(!response.ok)throw new Error('Не удалось загрузить '+path);zip.file(path,await response.arrayBuffer());done++;downloadStatus.textContent=`Загрузка файлов: ${done} / ${tasks.length}`;}}));
  zip.file('SELECTED-ITEMS.txt','SAHARA / САХАРА — выбранные элементы\n\n'+[...selected].map(id=>byId.get(id).title).join('\n')+'\n\nШаблоны с полями в скобках необходимо заполнить перед публикацией.\n');
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},m=>{downloadStatus.textContent=`Сборка ZIP: ${Math.round(m.percent)}%`;});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SAHARA-selected.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);success=true;
 }catch(e){downloadStatus.textContent='Не удалось собрать архив. Проверьте соединение и повторите скачивание. '+e.message;}
 finally{const message=downloadStatus.textContent;lock(false);downloadStatus.textContent=success?'ZIP подготовлен. Если браузер спросит, разрешите сохранение файла.':message;}
});
filter();update();
