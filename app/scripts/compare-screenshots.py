"""Compose captured reference/implementation images for visual review."""
from pathlib import Path
from PIL import Image, ImageDraw

p = Path(__file__).resolve().parent.parent / 'references'
source = Image.open(p / 'windows7-desktop.png').convert('RGB')
actual = Image.open(p / 'desktop-reference-size.png').convert('RGB')
assert actual.size == (1280, 960), actual.size
board = Image.new('RGB', (1280, 518), '#f2f4f7')
board.paste(source, (0, 38))
board.paste(actual.resize((640, 480)), (640, 38))
draw = ImageDraw.Draw(board)
draw.text((12, 12), 'REFERENCE: Windows 7, source displayed at 640 x 480', fill='#223344')
draw.text((652, 12), 'IMPLEMENTATION: 1280 x 960, displayed at 50%', fill='#223344')
board.save(p / 'comparison-desktop.png')

focus = Image.new('RGB', (880, 588), '#f2f4f7')
focus.paste(source.resize((1280, 960)).crop((0, 410, 440, 960)), (0, 38))
focus.paste(actual.crop((0, 410, 440, 960)), (440, 38))
draw = ImageDraw.Draw(focus)
draw.text((12, 12), 'REFERENCE: Start, 2x source scale', fill='#223344')
draw.text((452, 12), 'IMPLEMENTATION: Start, native CSS scale', fill='#223344')
focus.save(p / 'comparison-start.png')

ref = Image.open(p / 'aero-controls-reference.png')
app = Image.open(p / 'projects-final.png')
controls = Image.new('RGB', (840, 175), '#eef1f5')
controls.paste(ref.crop((479, 431, 1195, 461)), (10, 35))
controls.paste(app.crop((261, 68, 1067, 97)), (10, 115))
draw = ImageDraw.Draw(controls)
draw.text((10, 10), '7.css reference title bar (inactive)', fill='#223344')
draw.text((10, 90), 'Portfolio title bar (active), same CSS pixel scale', fill='#223344')
controls.save(p / 'comparison-controls.png')
print('Created desktop, Start menu, and title bar comparison boards.')
