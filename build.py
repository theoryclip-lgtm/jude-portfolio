#!/usr/bin/env python3
"""
build.py — inline every demo site into the portfolio so it works as ONE file.

Why: the portfolio previews are iframes pointing at ./marisol/index.html etc.
Relative paths only resolve when the folders sit next to the portfolio. Downloading
files from a chat flattens them into one folder, so the iframes 404 and you get a
grey box. This embeds each demo's full HTML directly into the portfolio instead.

Run it from the folder containing jude-portfolio.html:

    python3 build.py

There is an identical Node port next to this file — `node build.js` — for
machines without Python. Keep the two in step if you change either.

Output: jude-portfolio-standalone.html — open it from anywhere, no folders needed.
Re-run it whenever you change a demo site.
"""

import base64, re, sys, pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / "jude-portfolio.html"
OUT = ROOT / "jude-portfolio-standalone.html"

# demo key -> folder. Key must match the iframe src folder name.
DEMOS = {
    "crew-salon": ROOT / "crew-salon" / "index.html",
    "marisol":          ROOT / "marisol"          / "index.html",
    "nailed-it-studio": ROOT / "nailed-it-studio" / "index.html",
}


def esc(html: str) -> str:
    """
    Make HTML safe to sit inside <script type="text/plain">.

    This used to escape "</script" to "<\\/script" so the payload couldn't
    close the wrapper tag — but nothing ever undid the escape, so the mangled
    text went straight into srcdoc. A demo with inline <script> blocks (Nailed
    It Studio has many) ended up with a script element that never closed and
    swallowed the rest of the page, rendering an empty document. Base64 can't
    contain a closing tag at all and round-trips exactly.
    """
    return base64.b64encode(html.encode("utf-8")).decode("ascii")


def rebase(html: str, key: str) -> str:
    """
    An inlined iframe inherits the PARENT page's base URL, so a demo's
    images/hero.jpg would resolve next to the portfolio instead of inside
    the demo folder. A <base> tag fixes that when the folders are present,
    and harmlessly 404s to the gradient fallback when they aren't.
    """
    return html.replace("<head>", f'<head>\n<base href="{key}/">', 1)


def main():
    if not SRC.exists():
        sys.exit(f"Can't find {SRC.name} next to this script.")

    portfolio = SRC.read_text(encoding="utf-8")
    blocks, found, missing = [], [], []

    for key, path in DEMOS.items():
        if path.exists():
            blocks.append(
                f'<script type="text/plain" data-demo="{key}">\n'
                f'{esc(rebase(path.read_text(encoding="utf-8"), key))}\n</script>'
            )
            found.append(key)
        else:
            missing.append(key)

    # Point every preview iframe at its key instead of a file path.
    portfolio = re.sub(
        r'<iframe src="([\w-]+)/index\.html"',
        lambda m: f'<iframe data-demo="{m.group(1)}"',
        portfolio,
    )
    # Same for the "View live site" links.
    portfolio = re.sub(
        r'href="([\w-]+)/index\.html"',
        lambda m: f'href="#" data-open="{m.group(1)}"',
        portfolio,
    )

    runtime = """
<script>
(function(){
  var store={};
  function decode(b64){
    var bin=atob(b64), bytes=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  }
  document.querySelectorAll('script[type="text/plain"][data-demo]').forEach(function(s){
    try{ store[s.dataset.demo]=decode(s.textContent.trim()); }catch(e){}
  });
  document.querySelectorAll('iframe[data-demo]').forEach(function(f){
    var html=store[f.dataset.demo];
    if(html){ f.srcdoc=html; }
    else{
      var box=f.closest('.mock-live');
      if(box){
        box.style.cssText+=';display:grid;place-items:center;background:#EDEBE4;';
        box.innerHTML='<p style="font:600 .72rem/1.6 Archivo,sans-serif;letter-spacing:.16em;'
          +'text-transform:uppercase;color:#56534C;text-align:center;padding:2rem">'
          +f.dataset.demo.replace(/-/g," ")+'<br><span style="opacity:.6">folder not found at build time</span></p>';
      }
    }
  });
  document.querySelectorAll('[data-open]').forEach(function(a){
    a.addEventListener('click',function(e){
      e.preventDefault();
      var html=store[a.dataset.open];
      if(!html){ alert('That demo was not bundled. Re-run build.py with the folder present.'); return; }
      var url=URL.createObjectURL(new Blob([html],{type:'text/html'}));
      window.open(url,'_blank','noopener');
      setTimeout(function(){URL.revokeObjectURL(url)},60000);
    });
  });
})();
</script>
"""

    portfolio = portfolio.replace("</body>", "\n".join(blocks) + runtime + "\n</body>")
    OUT.write_text(portfolio, encoding="utf-8")

    print(f"Wrote {OUT.name}  ({len(portfolio)//1024} KB)")
    print("  bundled: " + (", ".join(found) or "nothing"))
    if missing:
        print("  missing: " + ", ".join(missing))
        print("  (add those folders next to this script and re-run)")


if __name__ == "__main__":
    main()
