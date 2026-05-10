(function(){
  function lsGet(key, def){
    try{
      const v = localStorage.getItem(key);
      return v === null ? def : v;
    }catch(e){
      return def;
    }
  }
  function lsSet(key, val){
    try{ localStorage.setItem(key, val); }catch(e){}
  }
  function isDarkMode() {
    return document.documentElement.getAttribute('data-mode') === 'dark' || 
           document.body.classList.contains('dark') || 
           (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function parseCoords(input) {
    if (!input) return null;
    let lng, lat;
    if (Array.isArray(input)) {
        if (input.length < 2) return null;
        lng = parseFloat(input[0]);
        lat = parseFloat(input[1]);
    } else if (typeof input === 'object') {
        lng = parseFloat(input.lng || input.lon || input.longitude);
        lat = parseFloat(input.lat || input.latitude);
    } else if (typeof input === 'string') {
        const parts = input.split(',').map(s => parseFloat(s.trim()));
        if (parts.length >= 2) {
            lng = parts[0];
            lat = parts[1];
        }
    }
    if (isNaN(lng) || isNaN(lat)) return null;
    return { lng, lat };
  }

  function escapeHtml(str) {
      if (typeof str !== 'string') return str;
      return str.replace(/[&<>'"]/g, 
          tag => ({
              '&': '&amp;',
              '<': '&lt;',
              '>': '&gt;',
              "'": '&#39;',
              '"': '&quot;'
          }[tag])
      );
  }

  // 兼容旧代码：全局 Utils 对象 + 全局函数
  window.Utils = { lsGet, lsSet, isDarkMode, parseCoords, escapeHtml };
  window.lsGet = lsGet;
  window.lsSet = lsSet;
})();
