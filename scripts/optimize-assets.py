"""Create web delivery variants; retain original files for old cached pages."""
from pathlib import Path
import json
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.build-tools'))
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

dist = ROOT / 'dist' if (ROOT / 'dist').is_dir() else ROOT
image_before = image_after = font_before = font_after = 0
for source in sorted((dist / 'assets/figma').glob('*.png')):
    with Image.open(source) as image:
        target = source.with_suffix('.webp')
        image.save(target, 'WEBP', quality=85, method=6, lossless=max(image.size) <= 160)
        image_before += source.stat().st_size
        image_after += target.stat().st_size

works_path = dist / 'assets/works.json'
works = json.loads(works_path.read_text())
thumbs = dist / 'assets/thumbs'
thumbs.mkdir(exist_ok=True)
previews = dist / 'assets/previews'
previews.mkdir(exist_ok=True)
for work in works:
    target = thumbs / (work['id'].lower() + '.webp')
    with Image.open(dist / work['image']) as image:
        image.thumbnail((800, 800))
        image.save(target, 'WEBP', quality=80, method=6)
        work['thumbnail_width'], work['thumbnail_height'] = image.size
    work['thumbnail'] = str(target.relative_to(dist))
    with Image.open(dist / work['image']) as image:
        image.thumbnail((1536, 1536))
        preview = previews / target.name
        image.save(preview, 'WEBP', quality=82, method=6)
        work['preview_width'], work['preview_height'] = image.size
        work['preview'] = str(preview.relative_to(dist))
works_path.write_text(json.dumps(works, ensure_ascii=False, indent=2))

unicodes = set(range(0x20, 0x250)) | set(range(0x400, 0x530)) | set(range(0x2000, 0x2070)) | set(range(0x2190, 0x2200))
for source in sorted((dist / 'assets/fonts').glob('*.ttf')):
    font = TTFont(source)
    if source.stem == 'caveat':
        instantiateVariableFont(font, {'wght': 400}, inplace=True)
    options = subset.Options()
    options.flavor = 'woff2'
    options.layout_features = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=(set(range(0x20, 0x7f)) | set(range(0x400, 0x460)) | {0x2013, 0x2014, 0x2019, 0x2026}) if source.stem == 'caveat' else unicodes)
    subsetter.subset(font)
    font.flavor = 'woff2'
    target = source.with_suffix('.woff2')
    font.save(target)
    font_before += source.stat().st_size
    font_after += target.stat().st_size

report = {'figmaImagesBefore': image_before, 'figmaImagesAfter': image_after,
          'fontsBefore': font_before, 'fontsAfter': font_after,
          'artworkThumbnailBytes': sum(p.stat().st_size for p in thumbs.glob('*.webp'))}
(ROOT / 'asset-optimization.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report))
