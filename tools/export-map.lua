-- Export an Aseprite tilemap into the JSON the game imports.
--
--   aseprite -b \
--     --script-param file=assets/maps/overworld.aseprite \
--     --script-param out=public/maps/overworld.json \
--     --script tools/export-map.lua
--
-- Expected document layout:
--   layer "terrain"  tilemap; tiles carrying property solid=true become collision
--   layer "entities" tilemap; tiles carrying property kind=<string> become entities
--   slices           any slice carrying property kind=<string> becomes an entity,
--                    keeping its rectangle (used by kind="dark")
--
-- Entity coordinates are pixels, top-left corner, plus w/h. Interpretation of
-- kind and the remaining properties is the importer's job, not this script's.

local function fail(msg)
  io.stderr:write("export-map: " .. msg .. "\n")
  os.exit(1)
end

local function toTable(props)
  local t = {}
  for k, v in pairs(props) do
    if math.type(v) == "float" and math.tointeger(v) then t[k] = math.tointeger(v) else t[k] = v end
  end
  return t
end

local function isEmpty(t)
  return next(t) == nil
end

local file = app.params["file"]
local out = app.params["out"]
if not out then fail("missing --script-param out=<path.json>") end

local sprite = file and app.open(file) or app.sprite
if not sprite then fail("no sprite: pass --script-param file=<path.aseprite>") end

-- Every tilemap layer except "entities" is terrain, exported bottom-to-top in
-- the document's own stacking order. Tiny Swords tiles are transparent at the
-- edges, so a wall has to sit over ground rather than replace it.
local layers = {}
local terrainLayers = {}
for _, layer in ipairs(sprite.layers) do
  if layer.isTilemap then
    layers[layer.name] = layer
    if layer.name ~= "entities" then terrainLayers[#terrainLayers + 1] = layer end
  end
end
if #terrainLayers == 0 then fail("no terrain tilemap layer in " .. sprite.filename) end
local terrain = terrainLayers[1]

local tileSize = terrain.tileset.grid.tileSize
local tw, th = tileSize.width, tileSize.height
local cols = sprite.width // tw
local rows = sprite.height // th

-- Read one tilemap layer into a flat, sprite-sized array of tile indices.
-- A cel can be smaller than the sprite, so start from zeros and blit it in.
local function readLayer(layer)
  local grid = {}
  for i = 1, cols * rows do grid[i] = 0 end
  local cel = layer:cel(1)
  if not cel then return grid end
  local ox = cel.position.x // tw
  local oy = cel.position.y // th
  local img = cel.image
  for y = 0, img.height - 1 do
    for x = 0, img.width - 1 do
      local cx, cy = x + ox, y + oy
      if cx >= 0 and cx < cols and cy >= 0 and cy < rows then
        grid[cy * cols + cx + 1] = app.pixelColor.tileI(img:getPixel(x, y))
      end
    end
  end
  return grid
end

local function tileProps(tileset)
  local out = {}
  for i = 0, #tileset - 1 do
    local props = toTable(tileset:tile(i).properties)
    if not isEmpty(props) then out[tostring(i)] = props end
  end
  return out
end

local entities = {}

local entityLayer = layers["entities"]
if entityLayer then
  local grid = readLayer(entityLayer)
  local props = tileProps(entityLayer.tileset)
  for i = 1, #grid do
    local idx = grid[i]
    local p = idx > 0 and props[tostring(idx)] or nil
    if p and p.kind then
      local cell = i - 1
      local copy = {}
      for k, v in pairs(p) do if k ~= "kind" then copy[k] = v end end
      entities[#entities + 1] = {
        kind = p.kind,
        x = (cell % cols) * tw,
        y = (cell // cols) * th,
        w = tw,
        h = th,
        props = copy,
      }
    end
  end
end

for _, slice in ipairs(sprite.slices) do
  local p = toTable(slice.properties)
  if p.kind then
    local copy = {}
    for k, v in pairs(p) do if k ~= "kind" then copy[k] = v end end
    copy.name = copy.name or slice.name
    entities[#entities + 1] = {
      kind = p.kind,
      x = slice.bounds.x,
      y = slice.bounds.y,
      w = slice.bounds.width,
      h = slice.bounds.height,
      props = copy,
    }
  end
end

-- Write the terrain tileset out as a strip so the renderer can blit from it.
-- Index N in the terrain array is the Nth cell of the strip, tile 0 included
-- (it is the empty tile), so no offset maths is needed at draw time.
local function writeTilesetStrip(tileset, path)
  local count = #tileset
  local strip = Image(count * tw, th, ColorMode.RGB)
  for i = 0, count - 1 do
    strip:drawImage(tileset:tile(i).image, Point(i * tw, 0))
  end
  local out = Sprite(count * tw, th, ColorMode.RGB)
  out.cels[1].image = strip
  out:saveAs(path)
  out:close()
  return count
end

local base = app.fs.fileTitle(app.fs.fileName(out))
local exported = {}
for i, layer in ipairs(terrainLayers) do
  local stripName = string.format("%s-%s.png", base, layer.name)
  local stripPath = app.fs.joinPath(app.fs.filePath(out), stripName)
  local count = writeTilesetStrip(layer.tileset, stripPath)
  exported[i] = {
    name = layer.name,
    tileset = { image = stripName, count = count },
    tiles = tileProps(layer.tileset),
    cells = readLayer(layer),
  }
end

local doc = {
  name = app.fs.fileTitle(sprite.filename),
  tileWidth = tw,
  tileHeight = th,
  cols = cols,
  rows = rows,
  layers = exported,
  entities = entities,
}

local fh, err = io.open(out, "w")
if not fh then fail("cannot write " .. out .. ": " .. tostring(err)) end
fh:write(json.encode(doc))
fh:close()

local names = {}
for i, l in ipairs(exported) do names[i] = l.name .. "(" .. l.tileset.count .. ")" end
print(string.format("export-map: %s -> %s (%dx%d tiles, %d entities, layers: %s)",
  sprite.filename, out, cols, rows, #entities, table.concat(names, " ")))
