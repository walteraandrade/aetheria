-- One-off migration: turn the string map in src/levels.js into an editable
-- Aseprite document laid out the way tools/export-map.lua expects.
--
--   node tools/world-to-json.mjs /tmp/world.json
--   aseprite -b \
--     --script-param world=/tmp/world.json \
--     --script-param out=assets/maps/overworld.aseprite \
--     --script tools/strings-to-aseprite.lua
--
-- Tiles are flat colours — placeholders to be repainted over a real tileset.
-- What matters is the structure: which tile is solid, which one carries which
-- entity, and the properties hanging off each.

local function fail(msg)
  io.stderr:write("strings-to-aseprite: " .. msg .. "\n")
  os.exit(1)
end

local worldPath = app.params["world"]
local out = app.params["out"]
if not worldPath or not out then fail("need --script-param world=<json> and out=<path.aseprite>") end

local fh = io.open(worldPath, "r")
if not fh then fail("cannot read " .. worldPath) end
local world = json.decode(fh:read("a"))
fh:close()

local T = world.tile or 32
local map = world.map
local rows = #map
local cols = #map[1]

local sprite = Sprite(cols * T, rows * T)
app.activeSprite = sprite
sprite.gridBounds = Rectangle(0, 0, T, T)
while #sprite.layers > 0 do sprite:deleteLayer(sprite.layers[1]) end

local slicer = dofile(app.params["slicer"] or "tools/slice-tiles.lua")
local SHEETS = {
  floor = app.params["floorSheet"] or "public/assets/tiny-swords/terrain/tilemap-floor.png",
  wall  = app.params["wallSheet"] or "public/assets/tiny-swords/terrain/tilemap-wall.png",
}

-- The raw XOR keeps its low bits in lockstep with x and y, so taking it
-- modulo a small variant count walks 1,2,3,4,1,2,3,4 across a row. Mixing the
-- high bits down first is what makes the choice look scattered.
local function tileNoise(x, y)
  local h = (x * 73856093) ~ (y * 19349663) ~ 0x9e3779b9
  h = (h ~ (h >> 33)) * 0xff51afd7ed558ccd
  h = (h ~ (h >> 29)) * 0xc4ceb9fe1a85ec53
  h = h ~ (h >> 32)
  return (h % 100 + 100) % 100
end

local function paint(tileset, index, r, g, b, a)
  local tile = tileset:tile(index)
  local img = Image(tile.image.spec)
  img:clear(Color{ r = r, g = g, b = b, a = a or 255 })
  tile.image = img
end

local function setTile(tileset, index, name)
  tileset:tile(index).image = slicer.cut(SHEETS, name, T)
end

local function newTilemapLayer(name)
  app.activeSprite = sprite
  app.command.NewLayer{ tilemap = true }
  local layer
  for _, l in ipairs(sprite.layers) do
    if l.isTilemap and l.name ~= "ground" and l.name ~= "terrain" and l.name ~= "entities" then
      layer = l
    end
  end
  layer.name = name
  return layer
end

-- ground: grass under everything. Tiny Swords tiles are transparent at their
-- edges, so walls must sit on top of ground instead of replacing it.
local GRASS = { "floor", "floorB", "floorC", "floorD" }
local ground = newTilemapLayer("ground")
for _ = 1, #GRASS + 1 do sprite:newTile(ground.tileset) end
for i, name in ipairs(GRASS) do
  setTile(ground.tileset, i, name)
  ground.tileset:tile(i).data = "grass-" .. i
end
setTile(ground.tileset, #GRASS + 1, "floorAlt")
ground.tileset:tile(#GRASS + 1).data = "grass-dark"

-- terrain: the cliffs that block movement, drawn over the ground
local terrain = newTilemapLayer("terrain")
for _ = 1, 2 do sprite:newTile(terrain.tileset) end
setTile(terrain.tileset, 1, "wall")
setTile(terrain.tileset, 2, "wallTop")
terrain.tileset:tile(1).properties.solid = true
terrain.tileset:tile(1).data = "cliff"
terrain.tileset:tile(2).properties.solid = true
terrain.tileset:tile(2).data = "cliff-top"

-- entities: one marker tile per distinct entity flavour
local entities = newTilemapLayer("entities")
local markers = {}
local function marker(key, kind, props, r, g, b)
  if markers[key] then return markers[key] end
  local tile = sprite:newTile(entities.tileset)
  local index = tile.index
  paint(entities.tileset, index, r, g, b)
  entities.tileset:tile(index).properties.kind = kind
  for k, v in pairs(props or {}) do entities.tileset:tile(index).properties[k] = v end
  entities.tileset:tile(index).data = key
  markers[key] = index
  return index
end

for i, key in ipairs(world.bellKeys or {}) do
  marker("bell_" .. key, "bell", { interval = key }, 143, 127, 212 + (i % 2) * 20)
end
for char, pool in pairs(world.doorPools or {}) do
  marker("door_" .. char, "door", { pool = table.concat(pool, ",") }, 208, 90, 90)
end
marker("player", "player", nil, 224, 180, 92)
marker("crystal", "crystal", nil, 124, 196, 138)
marker("enemy", "enemy", nil, 240, 144, 143)
for char, portal in pairs(world.portals or {}) do
  marker("portal_" .. char, "portal",
    { to = portal.to, spawn = portal.spawn, id = portal.id }, 92, 127, 208)
end
for char, id in pairs(world.spawns or {}) do
  marker("spawn_" .. char, "spawn", { id = id }, 92, 208, 180)
end

local groundImg = Image(ImageSpec{ width = cols, height = rows, colorMode = ColorMode.TILEMAP })
local terrainImg = Image(ImageSpec{ width = cols, height = rows, colorMode = ColorMode.TILEMAP })
local entityImg = Image(ImageSpec{ width = cols, height = rows, colorMode = ColorMode.TILEMAP })

local placed = 0
for r = 1, rows do
  local row = map[r]
  for c = 1, cols do
    local ch = row:sub(c, c)
    local x, y = c - 1, r - 1
    groundImg:drawPixel(x, y, (tileNoise(x, y) % #GRASS) + 1)
    -- Every wall is the plain cliff body. The sheet's edge pieces need real
    -- auto-tiling (nine variants chosen by neighbour) to look right; picking
    -- them by a single rule leaves floating strips. Tile 2 stays in the
    -- tileset, unused, until that lands.
    if ch == "#" then terrainImg:drawPixel(x, y, 1) end
    local m
    if ch:match("%d") and world.bellKeys and world.bellKeys[tonumber(ch)] then
      m = markers["bell_" .. world.bellKeys[tonumber(ch)]]
    elseif world.doorPools[ch] then
      m = markers["door_" .. ch]
    elseif ch == "P" then m = markers["player"]
    elseif ch == "C" then m = markers["crystal"]
    elseif ch == "E" then m = markers["enemy"]
    elseif (world.portals or {})[ch] then m = markers["portal_" .. ch]
    elseif (world.spawns or {})[ch] then m = markers["spawn_" .. ch]
    end
    if m then
      entityImg:drawPixel(x, y, m)
      placed = placed + 1
    end
  end
end

sprite:newCel(ground, 1, groundImg, Point(0, 0))
sprite:newCel(terrain, 1, terrainImg, Point(0, 0))
sprite:newCel(entities, 1, entityImg, Point(0, 0))

for i, zone in ipairs(world.darkZones or {}) do
  local slice = sprite:newSlice(Rectangle(
    zone.x0 * T, zone.y0 * T,
    (zone.x1 - zone.x0 + 1) * T, (zone.y1 - zone.y0 + 1) * T))
  slice.name = "dark_" .. i
  slice.properties.kind = "dark"
end

sprite:saveAs(out)
print(string.format("strings-to-aseprite: %dx%d tiles, %d entities, %d dark zones -> %s",
  cols, rows, placed, #sprite.slices, out))
