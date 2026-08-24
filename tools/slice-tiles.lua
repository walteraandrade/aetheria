-- Cuts named tiles out of the Tiny Swords terrain sheets.
--
-- Both sheets share one 9x6 layout. Left block (cols 0-3) is flat grass;
-- right block (cols 5-8) is the same grass sitting on a cliff, with the
-- stone body in rows 4-5. Top-down, that cliff stone is what reads as a wall.
--
--   cols 0..2 / rows 0..2   grass 3x3: corners, edges, centre
--   col  3                  one-tile-wide variant
--   row  3                  one-tile-tall variant
--   rows 4..5 (cols 0..3)   inner/diagonal corner pieces
--   cols 5..8               same again, cliffed: row 3 is the grass-to-stone
--                           lip, rows 4-5 the stone face

local M = {}

local sheets = {}

local function loadSheet(path)
  if not sheets[path] then
    -- app.open switches the active sprite; put it back or the caller's next
    -- app.command.* lands on the sheet instead of the document being built.
    local previous = app.activeSprite
    local spr = app.open(path)
    if not spr then error("slice-tiles: cannot open " .. path) end
    local img = Image(spr.width, spr.height, ColorMode.RGBA)
    img:drawSprite(spr, 1)
    spr:close()
    app.activeSprite = previous
    sheets[path] = img
  end
  return sheets[path]
end

-- Grid position of every tile we use, plus an optional pixel offset.
--
-- The grass tufts sit in rows, so one tile repeated lines them up into stripes
-- that run across the screen. The grass block is a contiguous 3x3 of plain
-- grass, which is wider than one tile, so cutting at a few offsets inside it
-- yields variants that break the rows without changing colour. Offsets stay
-- small: past ~40px the cut reaches the block's dark edge and picks up specks.
M.CUTS = {
  floor    = { sheet = 'floor', col = 1, row = 1 },
  floorB   = { sheet = 'floor', col = 1, row = 1, dx = 26, dy = 10 },
  floorC   = { sheet = 'floor', col = 1, row = 1, dx = 10, dy = 26 },
  floorD   = { sheet = 'floor', col = 1, row = 1, dx = 34, dy = 34 },
  floorAlt = { sheet = 'wall',  col = 1, row = 1 },  -- the darker grass variant
  wall     = { sheet = 'floor', col = 6, row = 4 },  -- cliff stone body
  wallTop  = { sheet = 'floor', col = 6, row = 3 },  -- grass-to-stone lip
}

M.cut = function(paths, name, size)
  local spec = M.CUTS[name]
  if not spec then error("slice-tiles: unknown tile '" .. tostring(name) .. "'") end
  local sheet = loadSheet(paths[spec.sheet])
  local x = spec.col * size + (spec.dx or 0)
  local y = spec.row * size + (spec.dy or 0)
  if x + size > sheet.width or y + size > sheet.height then
    error(string.format("slice-tiles: %s at (%d,%d) is outside the %dx%d sheet",
      name, spec.col, spec.row, sheet.width // size, sheet.height // size))
  end
  return Image(sheet, Rectangle(x, y, size, size))
end

return M
