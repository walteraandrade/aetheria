-- Overlay the 64px grid and a per-cell index, so tiles can be identified.
local src = app.open(app.params["sheet"])
local T = tonumber(app.params["tile"] or "64")
local SC = tonumber(app.params["scale"] or "2")
local cols, rows = src.width // T, src.height // T

local flat = Image(src.width, src.height, ColorMode.RGBA)
flat:drawSprite(src, 1)
local out = Sprite(src.width, src.height, ColorMode.RGBA)
out.cels[1].image = flat
app.activeSprite = out
app.command.SpriteSize{ scale = SC, method = "nearest" }

-- grid lines drawn after scaling, so they stay 1px thin
local img = out.cels[1].image
local line = Color{ r = 255, g = 0, b = 128, a = 220 }
for c = 0, cols do
  local x = math.min(c * T * SC, img.width - 1)
  for y = 0, img.height - 1 do img:drawPixel(x, y, line) end
end
for r = 0, rows do
  local y = math.min(r * T * SC, img.height - 1)
  for x = 0, img.width - 1 do img:drawPixel(x, y, line) end
end
out:saveAs(app.params["out"])
print(string.format("grid %dx%d cells", cols, rows))
