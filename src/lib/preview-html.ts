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
  function upperRatio(text){
    var letters=(text.match(/[A-Za-zА-Яа-яЁё]/g)||[]).length;
    if(!letters) return 0;
    return (text.match(/[A-ZА-ЯЁ]/g)||[]).length/letters;
  }
  function isCtaCandidate(atom,css){
    var text=(atom.textContent||'').replace(/\s+/g,' ').trim();
    var size=parseFloat(css.fontSize)||16;
    return text.length>=6 && text.length<=96 && size<=34 && (upperRatio(text)>=0.55 || /\b(start|get|try|scale|book|buy|join|win|contact|demo|начать|купить|заказать|получить|демо)\b/i.test(text));
  }
  function overlap(a,b){
    var x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left));
    var y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    return x*y;
  }
  function findCtaChrome(elem){
    var er=elem.getBoundingClientRect();
    var root=elem.closest('.t396__artboard')||document;
    var best=null,bestScore=0;
    root.querySelectorAll('.t396__elem[data-elem-type="button"],.t396__elem[data-elem-type="shape"]').forEach(function(node){
      if(node===elem) return;
      var r=node.getBoundingClientRect();
      if(r.width<44||r.height<18||r.width>560||r.height>140) return;
      var atom=node.querySelector('.tn-atom');
      var st=getComputedStyle(atom||node);
      var radius=parseFloat(st.borderRadius)||0;
      var painted=(st.backgroundImage&&st.backgroundImage!=='none')||!/rgba?\(0, 0, 0, 0\)|transparent/i.test(st.backgroundColor)||st.boxShadow!=='none';
      if(!painted && radius<8) return;
      var cx=er.left+er.width/2,cy=er.top+er.height/2;
      var centered=cx>=r.left-12&&cx<=r.right+12&&cy>=r.top-12&&cy<=r.bottom+12;
      var area=overlap(er,r);
      if(!centered && area<Math.min(er.width*er.height,r.width*r.height)*0.08) return;
      var score=area+(centered?100000:0)-Math.abs((er.left+er.right-r.left-r.right)/2)*8;
      if(score>bestScore){bestScore=score;best=r;}
    });
    return best;
  }
  function fitOne(atom){
    var elem=atom.closest('.t396__elem');
    if(!elem) return;
    var css=getComputedStyle(atom);
    var isButton=elem.getAttribute('data-elem-type')==='button';
    var chrome=!isButton && isCtaCandidate(atom,css) ? findCtaChrome(elem) : null;
    var compactFit=isButton || !!chrome;
    var fontSize=parseFloat(css.fontSize)||16;
    atom.style.wordSpacing='normal';
    atom.style.letterSpacing='0px';
    atom.style.wordBreak='normal';
    atom.style.hyphens='none';
    atom.style.overflowWrap=compactFit?'normal':'break-word';
    atom.style.whiteSpace=compactFit?'nowrap':'normal';
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
    var maxW=chrome?Math.max(24,chrome.width-18):(isButton?(atom.clientWidth||atomRect.width):(elem.clientWidth||elemRect.width));
    var maxH=chrome?Math.max(12,chrome.height-8):(isButton?(atom.clientHeight||atomRect.height):(elem.clientHeight||elemRect.height));
    if(!maxW) return;
    var minSize=Math.max(compactFit?7:11, fontSize*(compactFit?0.30:0.55));
    var guard=0;
    while(guard<42 && fontSize>minSize && (atom.scrollWidth>maxW+1 || (maxH>0 && atom.scrollHeight>maxH+1))){
      fontSize=fontSize*(compactFit?0.90:0.93);
      atom.style.fontSize=fontSize+'px';
      var lh=parseFloat(getComputedStyle(atom).lineHeight);
      if(compactFit || (!isNaN(lh) && lh>fontSize*1.6)) atom.style.lineHeight=(fontSize*(compactFit?1.1:1.2))+'px';
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
