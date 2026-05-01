export function enhancePreviewHtml(html: string, sourceUrl: string): string {
  const safeUrl = sourceUrl.replace(/"/g, '&quot;');
  const cleaned = html.replace(/<base\b[^>]*>/gi, '');
  const injection = `<base href="${safeUrl}"><style id="personaswap-runtime-preview-fix">
html,body{min-width:0!important;max-width:100%!important;overflow-x:hidden!important;}
body{word-spacing:normal!important;letter-spacing:normal!important;}
.t-records,.t-records_animated,.t-records.t-records_visible{opacity:1!important;}
.t-animate,[data-animate-style],[data-animate-style-res-320],[data-animate-style-res-360],[data-animate-style-res-480],[data-animate-style-res-640],[data-animate-style-res-960]{opacity:1!important;transform:none!important;transition:none!important;}
.t396__artboard,.t396__carrier,.t396__filter{overflow:hidden!important;}
img[data-original]{visibility:visible!important;opacity:1!important;}
p,h1,h2,h3,h4,h5,h6,span,a,li{word-break:normal;overflow-wrap:break-word;hyphens:none;}
.t396__elem[data-elem-type="text"],.t396__elem[data-elem-type="button"]{box-sizing:border-box!important;}
.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom{box-sizing:border-box!important;word-spacing:normal!important;letter-spacing:0!important;word-break:normal!important;hyphens:none!important;}
.t396__elem[data-elem-type="button"] .tn-atom{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;width:100%!important;max-width:100%!important;min-width:0!important;height:100%!important;overflow:hidden!important;white-space:nowrap!important;line-height:1.1!important;}
</style><script id="personaswap-runtime-text-fit">
(function(){
  function fitOne(atom){
    var elem=atom.closest('.t396__elem');
    if(!elem) return;
    var css=getComputedStyle(atom);
    var isButton=elem.getAttribute('data-elem-type')==='button';
    var fontSize=parseFloat(css.fontSize)||16;
    atom.style.wordSpacing='normal';
    atom.style.letterSpacing='0px';
    atom.style.wordBreak='normal';
    atom.style.hyphens='none';
    atom.style.overflowWrap=isButton?'normal':'break-word';
    atom.style.whiteSpace=isButton?'nowrap':'normal';
    if(isButton){
      atom.style.display='flex';
      atom.style.alignItems='center';
      atom.style.justifyContent='center';
      atom.style.textAlign='center';
      atom.style.overflow='hidden';
      atom.style.maxWidth='100%';
      atom.style.width='100%';
      atom.style.height='100%';
      atom.style.minWidth='0';
      atom.style.lineHeight='1.1';
    }
    var elemRect=elem.getBoundingClientRect();
    var atomRect=atom.getBoundingClientRect();
    var maxW=(isButton?(atom.clientWidth||atomRect.width):(elem.clientWidth||elemRect.width));
    var maxH=(isButton?(atom.clientHeight||atomRect.height):(elem.clientHeight||elemRect.height));
    if(!maxW) return;
    var minSize=Math.max(isButton?8:11, fontSize*(isButton?0.38:0.55));
    var guard=0;
    while(guard<42 && fontSize>minSize && (atom.scrollWidth>maxW+1 || (maxH>0 && atom.scrollHeight>maxH+1))){
      fontSize=fontSize*(isButton?0.90:0.93);
      atom.style.fontSize=fontSize+'px';
      var lh=parseFloat(getComputedStyle(atom).lineHeight);
      if(isButton || (!isNaN(lh) && lh>fontSize*1.6)) atom.style.lineHeight=(fontSize*(isButton?1.1:1.2))+'px';
      guard++;
    }
  }
  function fitText(){
    var nodes=document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom');
    nodes.forEach(fitOne);
  }
  document.addEventListener('DOMContentLoaded',fitText);
  window.addEventListener('load',function(){fitText();setTimeout(fitText,300);setTimeout(fitText,1200);});
})();
</script>`;

  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `${injection}</head>`);
  }

  return /<head[^>]*>/i.test(cleaned)
    ? cleaned.replace(/<head[^>]*>/i, (m) => `${m}${injection}`)
    : `<head>${injection}</head>${cleaned}`;
}
