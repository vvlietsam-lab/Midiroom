/* Local visual preference; independent of musical project state. */
const skinControl=document.createElement('label');skinControl.className='skin-control';skinControl.innerHTML='<span>WEERGAVE</span><select id="studioSkin" aria-label="Studio-kleurthema"><option value="studio">Studio</option><option value="night">Night</option></select>';
document.querySelector('header').appendChild(skinControl);
function setStudioSkin(value){const skin=value==='night'?'night':'studio';document.documentElement.dataset.skin=skin;$('studioSkin').value=skin;try{localStorage.setItem('midiroom.skin',skin);}catch(e){}}
let storedSkin='studio';try{storedSkin=localStorage.getItem('midiroom.skin')||'studio';}catch(e){}setStudioSkin(storedSkin);
$('studioSkin').onchange=()=>setStudioSkin($('studioSkin').value);
document.querySelector('.workspace-heading h2').textContent='MIDI Studio';
document.querySelector('.sidebar-title .eyebrow')?.replaceChildren(document.createTextNode('TRACK BROWSER'));
