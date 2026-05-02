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
  function getBaseFont(atom){
    var stored=parseFloat(atom.getAttribute('data-ps-base-font')||'');
    if(stored) return stored;
    var css=getComputedStyle(atom);
    var base=parseFloat(css.fontSize)||16;
    atom.setAttribute('data-ps-base-font',String(base));
    return base;
  }
  function measureScale(atom){
    var elem=atom.closest('.t396__elem')||atom.parentElement;
    if(!elem) return 1;
    var fontSize=getBaseFont(atom);
    atom.style.fontSize=fontSize+'px';
    atom.removeAttribute('data-ps-fit-font');
    var fit=activeField(elem,'textfit');
    var isAutoWidth=/^autowidth$/i.test(fit);
    if(isAutoWidth){
      atom.style.textAlign=getComputedStyle(elem).textAlign||'center';
      atom.style.whiteSpace='nowrap';
      var declaredW=parseFloat(activeField(elem,'width'))||elem.clientWidth||atom.scrollWidth;
      if(!declaredW||atom.scrollWidth<=declaredW+1) return 1;
      return Math.max(0.72,Math.min(1,declaredW/(atom.scrollWidth+1)));
    }
    var maxW=elem.clientWidth;
    var maxH=elem.clientHeight;
    if(!maxW||!maxH) return 1;
    if(atom.scrollWidth<=maxW+1 && atom.scrollHeight<=maxH+1) return 1;
    var wScale=maxW/(atom.scrollWidth+1);
    var hScale=maxH/(atom.scrollHeight+1);
    return Math.max(0.72,Math.min(1,wScale,hScale));
  }
  function fitText(){
    normalizeTildaRuntime();
    var groups={};
    each(document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom'),function(atom){
      var elem=atom.closest('.t396__elem')||atom.parentElement;
      var art=atom.closest('.t396__artboard')||document.body;
      var type=elem ? (elem.getAttribute('data-elem-type')||'text') : 'text';
      var base=getBaseFont(atom);
      var key=(art.id||art.getAttribute('data-artboard-recid')||'page')+'|'+type+'|'+Math.round(base);
      if(!groups[key]) groups[key]={scale:1,atoms:[]};
      groups[key].atoms.push(atom);
      groups[key].scale=Math.min(groups[key].scale,measureScale(atom));
    });
    Object.keys(groups).forEach(function(key){
      var group=groups[key];
      group.atoms.forEach(function(atom){
        var base=getBaseFont(atom);
        atom.style.fontSize=(base*group.scale)+'px';
        if(group.scale<0.999) atom.setAttribute('data-ps-fit-font','group');
        else atom.removeAttribute('data-ps-fit-font');
      });
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
