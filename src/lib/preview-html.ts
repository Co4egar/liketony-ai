export function enhancePreviewHtml(html: string, sourceUrl: string): string {
  const safeUrl = sourceUrl.replace(/"/g, '&quot;');
  const cleaned = html.replace(/<base\b[^>]*>/gi, '');
  const injection = `<base href="${safeUrl}"><style id="personaswap-runtime-preview-fix">
html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:hidden!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
</style><script id="personaswap-runtime-text-fit">
(function(){
  function fitOne(atom){
    var elem=atom.closest('.t396__elem')||atom.parentElement;
    if(!elem) return;
    var maxW=elem.clientWidth;
    var maxH=elem.clientHeight;
    if(!maxW||!maxH) return;
    var css=getComputedStyle(atom);
    var fontSize=parseFloat(css.fontSize)||16;
    if(!fontSize) return;
    var fit=elem.getAttribute('data-field-textfit-value')||'';
    var w=window.innerWidth||document.documentElement.clientWidth;
    var bps=[320,360,480,640,960];
    for(var i=0;i<bps.length;i++){
      if(w<=bps[i]){
        var v=elem.getAttribute('data-field-textfit-res-'+bps[i]+'-value');
        if(v){fit=v;break;}
      }
    }
    var isAutoWidth=/^autowidth$/i.test(fit);
    if(isAutoWidth){
      atom.style.textAlign='center';
      atom.style.whiteSpace='nowrap';
      var minSize=8, maxSize=fontSize*4;
      var guard=0;
      while(guard<40 && fontSize>minSize && (atom.scrollWidth>maxW+1 || atom.scrollHeight>maxH+1)){
        fontSize=fontSize*0.94;
        atom.style.fontSize=fontSize+'px';
        guard++;
      }
      guard=0;
      while(guard<40 && fontSize<maxSize && atom.scrollWidth<maxW-2 && atom.scrollHeight<=maxH){
        var next=fontSize*1.04;
        atom.style.fontSize=next+'px';
        if(atom.scrollWidth>maxW+1 || atom.scrollHeight>maxH+1){
          atom.style.fontSize=fontSize+'px';
          break;
        }
        fontSize=next;
        guard++;
      }
      return;
    }
    if(atom.scrollWidth<=maxW+1 && atom.scrollHeight<=maxH+1) return;
    var minSize2=Math.max(8,fontSize*0.45);
    var guard2=0;
    while(guard2<32 && fontSize>minSize2 && (atom.scrollWidth>maxW+1 || atom.scrollHeight>maxH+1)){
      fontSize=fontSize*0.94;
      atom.style.fontSize=fontSize+'px';
      guard2++;
    }
  }
  function fitText(){
    document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom').forEach(fitOne);
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
