from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import importlib.util
import json
import tempfile
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "index.html").read_text()
class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.links, self.images, self.h1 = [], [], [], 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs: self.ids.append(attrs["id"])
        if tag == "h1": self.h1 += 1
        if tag == "img": self.images.append(attrs)
        for key in ("src", "href"):
            if key in attrs: self.links.append(attrs[key])
page = Page()
page.feed(html)
assert page.h1 == 1
assert len(page.ids) == len(set(page.ids)), "Duplicate IDs"
for image in page.images:
    assert "alt" in image, image
for link in page.links:
    url = urlsplit(link)
    if url.scheme or url.netloc: continue
    if url.path:
        assert (ROOT / unquote(url.path)).is_file(), f"Missing resource: {link}"
    elif url.fragment:
        assert url.fragment in page.ids, f"Missing anchor: {link}"
assert "fonts.googleapis.com" not in html and "fonts.gstatic.com" not in html
assert 'href="https://vend-design.ru/"' in html
assert 'content="index,follow,max-image-preview:large"' in html
for block in html.split('<script type="application/ld+json">')[1:]:
    json.loads(block.split("</script>")[0])
ET.fromstring((ROOT / "sitemap.xml").read_text())
spec = importlib.util.spec_from_file_location("build_public", ROOT / "scripts/build_public.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
with tempfile.TemporaryDirectory() as temp:
    for mode in ("beta", "production"):
        output = module.build(Path(temp) / mode, mode)
        assert not any((output / name).exists() for name in (".git", ".github", ".agents", "docs", "tests", "scripts", "DEPLOYMENT.md", "CNAME"))
        assert (output / "assets/fonts/OFL.txt").is_file()
        assert (output / "assets/fonts/manrope-variable.woff2").stat().st_size > 1000
        if mode == "beta":
            assert 'content="noindex,nofollow"' in (output / "index.html").read_text()
            assert not (output / "sitemap.xml").exists()
        else:
            assert (output / "index.html").read_bytes() == (ROOT / "index.html").read_bytes()
        try:
            module.build(output, mode)
        except ValueError:
            pass
        else:
            raise AssertionError("Build overwrote an existing directory")
print(f"PASS: local resources, anchors, metadata, JSON-LD, sitemap and both release modes ({len(page.images)} images)")
