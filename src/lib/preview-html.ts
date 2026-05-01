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
  // Non-invasive font-size shrinker. Touches ONLY font-size when text actually
  // overflows its original container. Never touches layout/alignment so the
  // original Tilda absolute positioning is preserved 1:1.
  function shrinkToFit(atom){
    var elem=atom.closest('.t396__elem')||atom.parentElement;
    if(!elem) return;
    var css=getComputedStyle(atom);
    var fontSize=parseFloat(css.fontSize)||16;
    if(!fontSize) return;
    var maxW=elem.clientWidth;
    var maxH=elem.clientHeight;
    if(!maxW||!maxH) return;
    if(atom.scrollWidth<=maxW+1 && atom.scrollHeight<=maxH+1) return;
    var minSize=Math.max(8,fontSize*0.45);
    var guard=0;
    while(guard<32 && fontSize>minSize && (atom.scrollWidth>maxW+1 || atom.scrollHeight>maxH+1)){
      fontSize=fontSize*0.94;
      atom.style.fontSize=fontSize+'px';
      guard++;
    }
  }
  function fitText(){
    document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom,.t396__elem[data-elem-type="text"] .tn-atom__text').forEach(shrinkToFit);
  }
  document.addEventListener('DOMContentLoaded',fitText);
  window.addEventListener('load',function(){fitText();setTimeout(fitText,400);setTimeout(fitText,1500);});
})();
</script>`;

  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `${injection}</head>`);
  }

  return /<head[^>]*>/i.test(cleaned)
    ? cleaned.replace(/<head[^>]*>/i, (m) => `${m}${injection}`)
    : `<head>${injection}</head>${cleaned}`;
}
