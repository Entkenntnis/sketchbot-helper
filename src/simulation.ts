export type Face = 'n' | 's' | 'e' | 'w'

export type Action = 'M' | 'L' | 'R' | 'S' | 'W'

export interface Map {
  width: number
  height: number
  grid: {
    type: 'empty' | 'block' | 'finish'
  }[][]
  actors: {
    type: 'player' | 'target' | 'enemy'
    health: number
    face: Face
    x: number // top, 0-index
    y: number // left, 0-index
    order: number
    rotation?: 'cw' | 'ccw'
  }[]
}

export interface SimulationResult {
  turns: Turn[]
  errorMessage?: string
}

interface Turn {
  map: Map
  player: { [key: number]: PlayerTurnData }
}

interface PlayerTurnData {
  action: Action
  probes: string
  health: number
}

export interface PlayerAction {
  order: number
  actions: Action[]
}

export function parseInput(input: string) {
  const linesRaw = input.trim().split('\n')
  const lines = linesRaw.map((l) => l.split(' ').filter((x) => x))

  // check rectangular and not empty
  if (lines.length < 1) throw 'no rows'
  for (const line of lines) {
    if (line.length !== lines[0].length) throw 'not rectangular'
  }

  const height = lines.length
  const width = lines[0].length

  const grid: Map['grid'] = []
  const actors: Map['actors'] = []

  for (let x = 0; x < width; x++) {
    grid[x] = []
    for (let y = 0; y < height; y++) {
      const val = lines[y][x]
      grid[x].push({
        type:
          val == 'x'
            ? 'block'
            : val == '_'
            ? 'empty'
            : val == 'f'
            ? 'finish'
            : 'empty', // ignore actors
      })
      if (val.startsWith('p')) {
        if (val.length !== 4) throw 'malformed player tag'
        const order = parseInt(val.charAt(1), 16)
        const face = val.charAt(2) as Face
        const health = parseInt(val.charAt(3), 16)
        if (!'nesw'.includes(face)) throw 'player face invalid'
        actors.push({ type: 'player', order, x, y, face, health })
      }
      if (val.startsWith('t')) {
        if (val.length !== 4) throw 'malformed target tag'
        const order = parseInt(val.charAt(1), 16)
        const face = val.charAt(2) as Face
        const health = parseInt(val.charAt(3), 16)
        if (!'news'.includes(face)) throw 'player face invalid'
        actors.push({ type: 'target', order, x, y, face, health })
      }
      if (val.startsWith('e')) {
        if (val.length !== 4) throw 'malformed enemy tag'
        const order = parseInt(val.charAt(1), 16)
        const face = val.charAt(2) as Face
        const health = parseInt(val.charAt(3), 16)
        if (!'news'.includes(face)) throw 'enemy face invalid'
        actors.push({
          type: 'enemy',
          order,
          x,
          y,
          face,
          health,
          rotation: 'ccw',
        })
      }
    }
  }

  actors.sort((a, b) => {
    if (a.order == b.order) throw 'order must be unique'
    return a.order - b.order
  })

  return { grid, actors, width, height }
}

export function printMap(map: Map) {
  let output = ''
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      let current = ''
      for (const actor of map.actors) {
        if (actor.x == x && actor.y == y) {
          current =
            actor.type.charAt(0) +
            actor.order.toString() +
            actor.face +
            actor.health.toString()
          break
        }
      }
      if (!current) {
        const val = map.grid[x][y].type
        current = val == 'empty' ? '_' : val == 'finish' ? 'f' : 'x'
      }
      output += current + ' '
    }
    output += '\n'
  }
  return output
}

export function simulate(map: Map, playerActions: PlayerAction[]) {
  let currentMap = map
  let errorMessage = ''
  let turns: Turn[] = []

  for (;;) {
    const currentTurn: Turn = { map: currentMap, player: {} }
    currentMap = JSON.parse(JSON.stringify(currentMap)) // clone
    const actorList = currentMap.actors.map((actor) => actor.order)

    for (const order of actorList) {
      const actor = currentMap.actors.find((actor) => actor.order == order)
      // make sure actor is still alive
      if (actor) {
        const playerAction = playerActions.find((x) => x.order == order)
        if (playerAction && playerAction.actions.length > turns.length) {
          // we have a human player
          const action = playerAction.actions[turns.length]
          currentTurn.player[order] = {
            action,
            health: actor.health,
            probes: getProbeString(currentMap, order) ?? '',
          }
          if (action == 'L') {
            actor.face = rotateCW(rotateCW(rotateCW(actor.face)))
          }
          if (action == 'R') {
            actor.face = rotateCW(actor.face)
          }
          if (action == 'M') {
            const newpos = move1(actor.x, actor.y, actor.face)
            const gridType = currentMap.grid[newpos.x][newpos.y].type
            if (
              gridType == 'block' ||
              currentMap.actors.some((a) => a.x == newpos.x && a.y == newpos.y)
            ) {
              actor.health--
            } else {
              actor.x = newpos.x
              actor.y = newpos.y
            }
          }
          if (action == 'S') {
            let pos = { x: actor.x, y: actor.y }
            bullet: {
              for (;;) {
                pos = move1(pos.x, pos.y, actor.face)
                if (
                  pos.x < 0 ||
                  pos.y < 0 ||
                  pos.x >= currentMap.width ||
                  pos.y >= currentMap.height
                ) {
                  break // out of bounds
                }
                if (currentMap.grid[pos.x][pos.y].type == 'block') {
                  break // hit wall
                }
                for (const actor of currentMap.actors) {
                  if (actor.x == pos.x && actor.y == pos.y) {
                    actor.health--
                    break bullet
                  }
                }
              }
            }
          }
        }
        if (actor.type == 'enemy') {
          let hit = false
          let pos = { x: actor.x, y: actor.y }
          bullet: {
            for (;;) {
              pos = move1(pos.x, pos.y, actor.face)
              if (
                pos.x < 0 ||
                pos.y < 0 ||
                pos.x >= currentMap.width ||
                pos.y >= currentMap.height
              ) {
                break // out of bounds
              }
              if (currentMap.grid[pos.x][pos.y].type == 'block') {
                break // hit wall
              }
              for (const actor of currentMap.actors) {
                if (actor.x == pos.x && actor.y == pos.y) {
                  actor.health--
                  hit = true
                  break bullet
                }
              }
            }
          }
          if (!hit) {
            //actor.face = rotateCW(rotateCW(rotateCW(actor.face)))
            // todo: change direction if obstacle
          }
        }
        currentMap.actors = currentMap.actors.filter((a) => a.health > 0)
      }
    }
    turns.push(currentTurn)
    if (
      currentMap.actors.filter((a) => a.type == 'player').length <
      playerActions.length
    ) {
      errorMessage = 'Friendly player died'
      break
    }
    if (Object.keys(currentTurn.player).length == 0) {
      break
    }
  }
  return { errorMessage, turns }
}

function rotateCW(face: Face): Face {
  switch (face) {
    case 'n':
      return 'e'
    case 'e':
      return 's'
    case 's':
      return 'w'
    case 'w':
      return 'n'
  }
}

function move1(x: number, y: number, face: Face) {
  switch (face) {
    case 'n':
      y--
      break
    case 'e':
      x++
      break
    case 's':
      y++
      break
    case 'w':
      x--
      break
  }
  return { x, y }
}

function probe(map: Map, face: Face, x: number, y: number) {
  let finishTile = -1
  let prefix = ''
  let distance = 0
  let pos = { x, y }
  probe: {
    for (;;) {
      pos = move1(pos.x, pos.y, face)
      if (pos.x < 0 || pos.y < 0 || pos.x >= map.width || pos.y >= map.height) {
        break // out of bounds
      }
      if (map.grid[pos.x][pos.y].type == 'block') {
        break // hit wall
      }
      if (map.grid[pos.x][pos.y].type == 'finish') {
        finishTile = distance
      }
      for (const actor of map.actors) {
        if (actor.x == pos.x && actor.y == pos.y) {
          if (actor.type == 'target') prefix = 'E'
          if (actor.type == 'enemy') prefix = 'E'
          if (actor.type == 'player') prefix = 'P'
          break probe
        }
      }
      distance++
    }
  }
  let output = prefix
  output += distance.toString()
  if (finishTile >= 0) {
    output += '/F' + finishTile.toString()
  }
  return output
}

export function getProbeString(map: Map, order: number) {
  const player = map.actors.find((x) => x.order == order)
  if (player) {
    return `front: ${probe(map, player.face, player.x, player.y)} back: ${probe(
      map,
      rotateCW(rotateCW(player.face)),
      player.x,
      player.y
    )} left: ${probe(
      map,
      rotateCW(rotateCW(rotateCW(player.face))),
      player.x,
      player.y
    )} right: ${probe(map, rotateCW(player.face), player.x, player.y)}`
  }
}
