(function(root){'use strict';
 function create(id,launcher=false){const e=document.createElement('section');e.id=id;e.className='sz-loading';e.setAttribute('aria-busy','true');e.innerHTML='<div class="sz-loading-copy">'+(launcher?'<img class="sz-loading-logo" src="../assets/icon.png" alt="">':'<span class="sz-brand" aria-hidden="true"></span>')+'<span class="sz-loading-kicker">STRIKE ZONE 2D</span><h2>'+(launcher?'Witaj w Strike Zone':'Przygotuj się do gry')+'</h2><p>'+(launcher?'Uruchamiamy launcher…':'Twoja następna runda czeka.')+'</p><div class="sz-loading-track" role="progressbar" aria-label="Wczytywanie"><i></i></div></div>';return e;}
 root.SzLoading={create};
})(globalThis);
