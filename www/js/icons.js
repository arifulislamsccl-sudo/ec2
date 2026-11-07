/* Line icons (24×24, stroke = currentColor) */
(function (root) {
  const P = {
    home: '<path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h4.5v-6h4v6h4.5V9"/>',
    pipe: '<path d="M4 6.5h7.5a8.5 8.5 0 0 1 8.5 8.5v5"/><path d="M4 10.5h7.5a4.5 4.5 0 0 1 4.5 4.5v5"/>',
    pump: '<circle cx="11" cy="13" r="6.5"/><circle cx="11" cy="13" r="2.2"/><path d="M11 6.5V3.5h8.5"/><path d="M17.5 13H21"/>',
    valve: '<path d="M3 8v9l9-4.5z"/><path d="M21 8v9l-9-4.5z"/><path d="M12 12.5V5"/><path d="M8.5 5h7"/>',
    heat: '<path d="M12 3c2.5 3.2 6 5.6 6 10.5a6 6 0 0 1-12 0c0-2.6 1.4-4.4 2.8-6 .5 1.7 1.4 2.8 2.7 3.2C11.8 8.2 11 5.5 12 3z"/>',
    fan: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2C11 6.5 12.5 3 15.5 3.5c2.4.4 2.2 3.6-.3 5.2-1 .7-2.1 1.2-3.2 1.5z"/><path d="M13.8 12c3.7-1 7.2.5 6.7 3.5-.4 2.4-3.6 2.2-5.2-.3-.7-1-1.2-2.1-1.5-3.2z"/><path d="M12 13.8c1 3.7-.5 7.2-3.5 6.7-2.4-.4-2.2-3.6.3-5.2 1-.7 2.1-1.2 3.2-1.5z"/><path d="M10.2 12c-3.7 1-7.2-.5-6.7-3.5.4-2.4 3.6-2.2 5.2.3.7 1 1.2 2.1 1.5 3.2z"/>',
    vessel: '<rect x="7" y="2.5" width="10" height="19" rx="5"/><path d="M7 9h10"/><path d="M7 15h10"/>',
    flask: '<path d="M9 3h6"/><path d="M10 3v6.2L4.6 18.8A1.5 1.5 0 0 0 5.9 21h12.2a1.5 1.5 0 0 0 1.3-2.2L14 9.2V3"/><path d="M7.2 15h9.6"/>',
    drop: '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
    gear: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2.5v2.7M12 18.8v2.7M2.5 12h2.7M18.8 12h2.7M5.3 5.3l1.9 1.9M16.8 16.8l1.9 1.9M5.3 18.7l1.9-1.9M16.8 7.2l1.9-1.9"/>',
    wrench: '<path d="M14.6 3.6a5 5 0 0 0-4.3 6.7l-6.6 6.6a2 2 0 0 0 2.8 2.8l6.6-6.6a5 5 0 0 0 6.7-4.3l-3 3-2.9-.6-.6-2.9z"/>',
    bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z"/>',
    grid: '<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9h17"/><path d="M9.2 9v11"/><path d="M14.8 9v11"/><path d="M9.2 4v5M14.8 4v5"/>',
    hook: '<path d="M8 3h8"/><path d="M12 3v7"/><path d="M12 10a4.5 4.5 0 1 1-4.5 4.5"/><path d="M7.5 14.5 6 13"/>',
    chart: '<path d="M4 20h16"/><path d="M7 17v-5"/><path d="M11 17V6"/><path d="M15 17v-3"/><path d="M19 17V9"/>',
    swap: '<path d="M4 8h15"/><path d="M15.5 4.5 19 8l-3.5 3.5"/><path d="M20 16H5"/><path d="M8.5 12.5 5 16l3.5 3.5"/>',
    data: '<rect x="4.5" y="3" width="15" height="18" rx="2.5"/><path d="M8.5 8h7"/><path d="M8.5 12h7"/><path d="M8.5 16h4"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.3-4.3"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    back: '<path d="m15 5-7 7 7 7"/>',
    next: '<path d="m9 5 7 7-7 7"/>',
    reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/>',
    list: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r=".9"/><circle cx="4" cy="12" r=".9"/><circle cx="4" cy="18" r=".9"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  root.icon = function (name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.data) + '</svg>';
  };
  root.LOGO = '<svg class="logo" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d3352"/><stop offset="1" stop-color="#0d1a2c"/></linearGradient></defs><rect x="1" y="1" width="62" height="62" rx="14" fill="url(#lg)" stroke="#2c4a6e" stroke-width="1.5"/><circle cx="32" cy="32" r="13.5" fill="none" stroke="#e9f2ff" stroke-width="4"/><path d="M32 8.5v12M32 43.5v12M8.5 32h12M43.5 32h12" stroke="#4da3ff" stroke-width="4.2" stroke-linecap="round"/><circle cx="32" cy="32" r="4.6" fill="#4da3ff"/></svg>';
})(window);
