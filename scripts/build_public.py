"""Build an allowlisted static release. Never upload the repository root."""
import argparse
from pathlib import Path
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ("index.html", "requisites.html", "favicon.svg", "robots.txt", "sitemap.xml")

def build(output, mode):
    output = Path(output).resolve()
    if output.exists():
        raise ValueError(f"Output already exists; choose a new directory: {output}")
    sources = [ROOT / name for name in PUBLIC] + list((ROOT / "assets").rglob("*"))
    if any(p.is_symlink() for p in sources):
        raise ValueError("Symlinks are not allowed in release assets")
    output.mkdir(parents=True)
    for name in PUBLIC:
        shutil.copy2(ROOT / name, output / name)
    shutil.copytree(ROOT / "assets", output / "assets")
    if mode == "beta":
        page = output / "index.html"
        page.write_text(page.read_text().replace(
            'content="index,follow,max-image-preview:large"',
            'content="noindex,nofollow"'), encoding="utf-8")
        requisites = output / "requisites.html"
        requisites.write_text(requisites.read_text().replace(
            '<meta charset="utf-8">', '<meta charset="utf-8">\n<meta name="robots" content="noindex,nofollow">'), encoding="utf-8")
        (output / "robots.txt").write_text("User-agent: *\nAllow: /\n", encoding="utf-8")
        (output / "sitemap.xml").unlink()
    return output

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("beta", "production"), default="beta")
    parser.add_argument("--output", required=True)
    parser.add_argument("--zip", action="store_true")
    args = parser.parse_args()
    output = build(args.output, args.mode)
    if args.zip:
        archive = output.with_suffix(".zip")
        with zipfile.ZipFile(archive, "x", zipfile.ZIP_DEFLATED) as bundle:
            for path in sorted(output.rglob("*")):
                if path.is_file():
                    bundle.write(path, path.relative_to(output))
        print(archive)
    print(output)
