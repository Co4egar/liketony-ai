export function enhancePreviewHtml(html: string, sourceUrl: string): string {
  const safeUrl = sourceUrl.replace(/"/g, '&quot;');
  const cleaned = html
    .replace(/<base\b[^>]*>/gi, '')
    .replace(/<style\b[^>]*id=["']personapress-[^"']*["'][\s\S]*?<\/style>/gi, '')
    .replace(/<script\b[^>]*id=["']personapress-[^"']*["'][\s\S]*?<\/script>/gi, '');
  const injection = `<base href="${safeUrl}"><style id="personapress-runtime-preview-fix">
html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:hidden!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
</style><script id="personapress-runtime-text-fit">
(function(){
  function each(list,fn){Array.prototype.forEach.call(list,fn);}
  function activeField(elem,name){
    var base=elem.getAttribute('data-field-'+name+'-value')||'';
    var w=window.innerWidth||document.documentElement.clientWidth;
    var bps=[320,360,480,640,960];
    for(var i=0;i<bps.length;i++){
      if(w<=bps[i]){
        var v=elem.getAttribute('data-field-'+name+'-res-'+bps[i]+'-value');
        if(v!==null&&v!=='') return v;
      }
    }
    return base;
  }
  function normalizeTildaRuntime(){
    each(document.querySelectorAll('.t396__elem[style]'),function(el){
      ['top','left','right','bottom','width','height','transform','transition','transition-duration'].forEach(function(prop){el.style.removeProperty(prop);});
      if(!el.getAttribute('style')) el.removeAttribute('style');
    });
  }
  function fitOne(atom){
    var elem=atom.closest('.t396__elem')||atom.parentElement;
    if(!elem) return;
    if(atom.getAttribute('data-ps-fit-font')==='1'){
      atom.style.removeProperty('font-size');
      atom.removeAttribute('data-ps-fit-font');
    }
    var css=getComputedStyle(atom);
    var fontSize=parseFloat(css.fontSize)||16;
    if(!fontSize) return;
    var fit=activeField(elem,'textfit');
    var isAutoWidth=/^autowidth$/i.test(fit);
    if(isAutoWidth){
      atom.style.textAlign=getComputedStyle(elem).textAlign||'center';
      atom.style.whiteSpace='nowrap';
      var declaredW=parseFloat(activeField(elem,'width'))||elem.clientWidth||atom.scrollWidth;
      var cssLeft=parseFloat(getComputedStyle(elem).left)||elem.offsetLeft||0;
      var targetCenter=declaredW ? cssLeft+declaredW/2 : 0;
      var minSize=Math.max(8,fontSize*0.45);
      var guard=0;
      while(guard<36 && declaredW && fontSize>minSize && atom.scrollWidth>declaredW+1){
        fontSize=fontSize*0.94;
        atom.style.fontSize=fontSize+'px';
        atom.setAttribute('data-ps-fit-font','1');
        guard++;
      }
      if(declaredW&&targetCenter){
        var actualW=elem.getBoundingClientRect().width||atom.getBoundingClientRect().width||atom.scrollWidth;
        if(actualW>0) elem.style.left=(targetCenter-actualW/2)+'px';
      }
      return;
    }
    var maxW=elem.clientWidth;
    var maxH=elem.clientHeight;
    if(!maxW||!maxH) return;
    if(atom.scrollWidth<=maxW+1 && atom.scrollHeight<=maxH+1) return;
    var minSize2=Math.max(8,fontSize*0.45);
    var guard2=0;
    while(guard2<32 && fontSize>minSize2 && (atom.scrollWidth>maxW+1 || atom.scrollHeight>maxH+1)){
      fontSize=fontSize*0.94;
      atom.style.fontSize=fontSize+'px';
      atom.setAttribute('data-ps-fit-font','1');
      guard2++;
    }
  }
  function fitText(){
    normalizeTildaRuntime();
    each(document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom'),fitOne);
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
