export function enhancePreviewHtml(html: string, sourceUrl: string): string {
  const safeUrl = sourceUrl.replace(/"/g, '&quot;');
  const cleaned = html
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<style\b[^>]*id=["']liketony-[^"']*["'][\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*id=["']liketony-[^"']*["'][\s\S]*?<\/script>/gi, '');
  const injection = `<base href="${safeUrl}"><style id="liketony-runtime-preview-fix">
html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:hidden!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
</style><script id="liketony-runtime-text-fit">
(function(){
  function each(list,fn){Array.prototype.forEach.call(list,fn);}
  function normalizeTildaRuntime(){
    each(document.querySelectorAll('.t396__elem[style]'),function(el){
      ['transform','transition','transition-duration'].forEach(function(prop){el.style.removeProperty(prop);});
      if(!el.getAttribute('style')) el.removeAttribute('style');
    });
  }
  function fitText(){
    normalizeTildaRuntime();
    each(document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom'),function(atom){
      atom.style.removeProperty('font-size');
      atom.removeAttribute('data-ps-fit-font');
      var elem=atom.closest('.t396__elem')||atom.parentElement;
      if(!elem||atom.getAttribute('data-lt-checked')==='1') return;
      atom.setAttribute('data-lt-checked','1');
      var maxW=elem.clientWidth;
      var maxH=elem.clientHeight;
      if(!maxW||!maxH) return;
      if(atom.scrollWidth<=maxW+1 && atom.scrollHeight<=maxH+1) return;
      var html=atom.innerHTML;
      var m=html.match(/<!--LTORIG:([^]*?)-->([^]*?)<!--\/LTORIG-->/);
      if(!m) return;
      try{ atom.textContent=decodeURIComponent(m[1]); }catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded',fitText);
  window.addEventListener('load',function(){fitText();setTimeout(fitText,400);setTimeout(fitText,1500);});
  window.addEventListener('resize',function(){clearTimeout(window.__psFitT);window.__psFitT=setTimeout(fitText,150);});
})();
</script>`;

  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `${injection}</head>`);
  }

  return /<head[^>]*>/i.test(cleaned)
    ? cleaned.replace(/<head[^>]*>/i, (m) => `${m}${injection}`)
    : `<head>${injection}</head>${cleaned}`;
}
