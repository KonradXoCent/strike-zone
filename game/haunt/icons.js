(function(root){'use strict';
 const paths={
 flashlight:'<path d="m9 7 6-2 5 6-5 5-5-4-3 4-3-3 4-3z"/><path d="m17 3 3-1m1 5 2-1m-2 5 2 1"/>',
 emf:'<rect x="5" y="3" width="14" height="19" rx="3"/><path d="M8 7h1m2 0h1m2 0h1m2 0h0M8 12h8m-8 4h5"/>',
 thermo:'<path d="M10 15V5a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0z"/><path d="M12 9v8m5-11h3m-3 4h2"/>',
 uv:'<path d="m5 19 4-5-2-5 6-5 6 6-4 6-4-1-4 6z"/><path d="m15 2 1-2m6 7 2-1" stroke="#ae8bfa"/>',
 spirit:'<rect x="3" y="7" width="18" height="15" rx="3"/><path d="M6 7 15 1M6 11h12M6 15h6m-6 3h6"/><circle cx="17" cy="17" r="1"/>',
 book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1zm0 0v16M5 8l4 1m-4 3 4 1m6-4 4-1m-4 5 4-1"/>',
 camera:'<rect x="2" y="6" width="13" height="13" rx="3"/><path d="m15 10 7-3v11l-7-3M7 4h4"/><circle cx="7" cy="11" r="1" fill="#ef7868"/>',
 dots:'<path d="M4 13h16v8H4zM8 13l4-9 4 9"/><path d="M4 5h0m4-3h0m8 0h0m4 3h0m2 5h0M2 10h0" stroke="#9cd8b0" stroke-width="3"/>',
 crucifix:'<path d="M10 2h4v5h6v4h-6v12h-4V11H4V7h6z" fill="#c7ad78" stroke="#e6d09e"/>',
 salt:'<path d="m9 3-2 7-2 10c4 3 10 3 14 0l-2-10-2-7zM9 3h6M7 10h10"/><path d="M9 15h0m4 2h0m2-3h0" stroke-width="2.5"/>',
 recorder:'<rect x="5" y="2" width="14" height="20" rx="3"/><path d="M8 6h8M8 9h8m-8 3h8"/><circle cx="12" cy="17" r="2"/>',
 photo:'<path d="M3 7h4l2-3h6l2 3h4v14H3z"/><circle cx="12" cy="13" r="4"/><path d="M18 9h1"/>',
 motion:'<rect x="6" y="3" width="12" height="17" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M10 16h4m-2 4v3" stroke="#89c9ac"/>',
 rempod:'<path d="M3 10c0-5 18-5 18 0v8c0 6-18 6-18 0z" fill="#2e3038"/><ellipse cx="12" cy="10" rx="9" ry="4" fill="#a43b3d"/><path d="M12 8V0"/><circle cx="6" cy="9" r="1.5" fill="#73d394"/><circle cx="11" cy="12" r="1.5" fill="#ef7772"/><circle cx="17" cy="9" r="1.5" fill="#65bdec"/>',
 toycar:'<path d="m3 10 4-5h9l4 5v9H3z" fill="#a44e4a"/><path d="M8 7h7l2 5H6zM4 15h3m10 0h3"/><path d="M1 9v5m21-5v5M1 18v4m21-4v4" stroke="#a0acb3" stroke-width="3"/>',
 mirror:'<ellipse cx="12" cy="10" rx="8" ry="9"/><path d="m7 4 9 11m-7 0 7-8M9 19v4m6-4v4"/>',
 ouija:'<rect x="1" y="4" width="22" height="17" rx="3"/><path d="m5 9 3-2 4 1 4-1 3 2M6 13h12m-8 3 2-3 3 3-3 3z"/>',
 tarot:'<rect x="4" y="3" width="14" height="19" rx="2"/><path d="m7 1 14 2 1 16M7 8h8m-4 2 3 5-3 4-3-4z"/>',
 power:'<path d="M12 2v10m-5-7a9 9 0 1 0 10 0"/>',
 journal:'<path d="M5 3h14v19H5zM3 7h4m-4 4h4m-4 4h4m3-8h6m-6 4h6m-6 4h4"/>',
 challenge:'<path d="m12 2 9 4v7c0 5-9 9-9 9s-9-4-9-9V6z"/><path d="m8 12 3 3 5-6"/>',
 crew:'<circle cx="8" cy="7" r="4"/><path d="M1 22v-5c0-6 14-6 14 0v5m1-19a4 4 0 0 1 0 8m2 3c4 0 5 3 5 7"/>',
 audio:'<path d="M4 9h4l5-5v16l-5-5H4zM17 7a8 8 0 0 1 0 10m3-13a12 12 0 0 1 0 16"/>'
 };
 root.HauntIcons=(id,cls='')=>'<svg class="tool-icon '+cls+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[id]||paths.journal)+'</svg>';
})(globalThis);
