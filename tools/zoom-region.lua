-- Crop a region of a PNG and blow it up, for inspecting pixel-level defects.
local src = app.open(app.params["src"])
local flat = Image(src.width, src.height, ColorMode.RGBA)
flat:drawSprite(src, 1)
local x = tonumber(app.params["x"]); local y = tonumber(app.params["y"])
local w = tonumber(app.params["w"]); local h = tonumber(app.params["h"])
local crop = Image(flat, Rectangle(x, y, w, h))
local out = Sprite(w, h, ColorMode.RGBA)
out.cels[1].image = crop
app.activeSprite = out
app.command.SpriteSize{ scale = tonumber(app.params["scale"] or "6"), method = "nearest" }
out:saveAs(app.params["out"])
print("zoom -> " .. app.params["out"])
