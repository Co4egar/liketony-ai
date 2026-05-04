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
/* Hide site-level loaders/preloaders/spinners that get stuck inside our preview iframe */
[class*="preloader"],[id*="preloader"],
[class*="page-loader"],[class*="site-loader"],
[class*="loader-overlay"],[class*="loading-overlay"],
.t-cover__filter-spinner,.t-store__prod-popup__loader,.t-feed__post-popup__loader,
.t-records-loader,.t-records__loader,.t396__loader,.tn-atom__loader,
[class*="spinner"]:not(button):not([class*="t-input"]):not([class*="t-form"]):not([class*="t-btn"]){
  display:none!important;visibility:hidden!important;opacity:0!important;animation:none!important;
}
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
    function restore(atom){
      var html=atom.innerHTML;
      var m=html.match(/<!--LTORIG:([^]*?)-->([^]*?)<!--\/LTORIG-->/);
      if(!m) return false;
      try{ atom.textContent=decodeURIComponent(m[1]); return true; }catch(e){ return false; }
    }
    function copyFont(probe,cs){
      probe.style.fontFamily=cs.fontFamily;
      probe.style.fontSize=cs.fontSize;
      probe.style.fontWeight=cs.fontWeight;
      probe.style.fontStyle=cs.fontStyle;
      probe.style.lineHeight=cs.lineHeight;
      probe.style.letterSpacing=cs.letterSpacing;
      probe.style.textTransform=cs.textTransform;
      probe.style.wordSpacing=cs.wordSpacing;
      probe.style.fontVariant=cs.fontVariant;
    }
    function measureTextWidth(atom){
      var probe=document.createElement('span');
      var cs=getComputedStyle(atom);
      probe.style.cssText='position:absolute;left:-99999px;top:-99999px;visibility:hidden;white-space:nowrap;';
      copyFont(probe,cs);
      probe.textContent=atom.textContent||'';
      document.body.appendChild(probe);
      var w=probe.getBoundingClientRect().width;
      document.body.removeChild(probe);
      return w;
    }
    function measureWrapped(atom,width){
      var probe=document.createElement('div');
      var cs=getComputedStyle(atom);
      probe.style.cssText='position:absolute;left:-99999px;top:-99999px;visibility:hidden;white-space:normal;word-wrap:break-word;';
      probe.style.width=width+'px';
      copyFont(probe,cs);
      probe.textContent=atom.textContent||'';
      document.body.appendChild(probe);
      var r=probe.getBoundingClientRect();
      var res={w:r.width,h:r.height,sw:probe.scrollWidth};
      document.body.removeChild(probe);
      return res;
    }
    each(document.querySelectorAll('.t396__elem[data-elem-type="text"] .tn-atom,.t396__elem[data-elem-type="button"] .tn-atom'),function(atom){
      atom.style.removeProperty('font-size');
      atom.removeAttribute('data-ps-fit-font');
      var elem=atom.closest('.t396__elem')||atom.parentElement;
      if(!elem||atom.getAttribute('data-lt-checked')==='1') return;
      atom.setAttribute('data-lt-checked','1');
      var isButton=elem.getAttribute('data-elem-type')==='button';
      var maxW=elem.clientWidth;
      var maxH=elem.clientHeight;
      if(!maxW||!maxH) return;
      var ar=atom.getBoundingClientRect();
      var er=elem.getBoundingClientRect();
      var overflow = atom.scrollWidth>atom.clientWidth+1 || atom.scrollHeight>atom.clientHeight+1
        || atom.scrollWidth>maxW+1 || atom.scrollHeight>maxH+1
        || ar.right>er.right+1 || ar.left<er.left-1 || ar.bottom>er.bottom+1 || ar.top<er.top-1;
      var pad=(parseFloat(getComputedStyle(atom).paddingLeft)||0)+(parseFloat(getComputedStyle(atom).paddingRight)||0);
      var padV=(parseFloat(getComputedStyle(atom).paddingTop)||0)+(parseFloat(getComputedStyle(atom).paddingBottom)||0);
      var innerW=maxW-pad-4;
      if(!overflow && isButton){
        if(measureTextWidth(atom)>innerW) overflow=true;
      }
      if(!overflow && !isButton){
        // Probe wrapped text against actual element width — catches artboard clipping
        var m=measureWrapped(atom,innerW);
        if(m.h>maxH-padV+1 || m.sw>innerW+1) overflow=true;
      }
      if(overflow) restore(atom);
    });
    each(document.querySelectorAll('.t396__elem[data-elem-type="button"]'),function(el){
      var r1=el.getBoundingClientRect();
      each(document.querySelectorAll('.t396__elem[data-elem-type="button"]'),function(other){
        if(other===el) return;
        var r2=other.getBoundingClientRect();
        if(r1.right>r2.left && r1.left<r2.right && r1.bottom>r2.top && r1.top<r2.bottom){
          var atom=el.querySelector('.tn-atom'); if(atom) restore(atom);
        }
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
