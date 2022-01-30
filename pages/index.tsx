import Head from 'next/head'
import { createRef, useEffect, useState } from 'react'

type Face = 'n' | 's' | 'e' | 'w'

interface Map {
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

function parseInput(input: string) {
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

function printMap(map: Map) {
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

interface ListingEntry {
  map: Map
  lastMap: Map
  movement1: string
  movement2: string
  movement3: string
  probe1: any
  probe2: any
  probe3: any
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

export default function Home() {
  const ref = createRef<HTMLTextAreaElement>()
  const [map, setMap] = useState<Map | undefined>(undefined)

  const players =
    map == undefined ? [] : map.actors.filter((a) => a.type == 'player')

  const player1Order = players.length >= 1 ? players[0].order : -1
  const player2Order = players.length >= 2 ? players[1].order : -1
  const player3Order = players.length >= 3 ? players[2].order : -1

  const [player1, setPlayer1] = useState<string>('')
  const [player2, setPlayer2] = useState<string>('')
  const [player3, setPlayer3] = useState<string>('')

  const [listing, setListing] = useState<ListingEntry[]>([])
  const [showMap, setShowMap] = useState(true)

  useEffect(() => {
    if (map) {
      const movements1 = player1.split('').filter((a) => a)
      const movements2 = player2.split('').filter((a) => a)
      const movements3 = player3.split('').filter((a) => a)

      const listingEntries: ListingEntry[] = []

      for (
        let i = 0;
        i <
        Math.max(
          movements1.length,
          movements2.length * Math.sign(player2Order),
          movements3.length * Math.sign(player3Order)
        );
        i++
      ) {
        const lastMap =
          listingEntries.length == 0
            ? map
            : listingEntries[listingEntries.length - 1].map

        const currentMap = JSON.parse(JSON.stringify(lastMap)) as Map

        let movement1 = ''
        let movement2 = ''
        let movement3 = ''

        let probe1: any = undefined
        let probe2: any = undefined
        let probe3: any = undefined

        currentMap.actors
          .filter((x) => x.type == 'player')
          .forEach((player) => {
            const movement =
              player.order == player1Order
                ? movements1[i] ?? ''
                : player.order == player2Order
                ? movements2[i] ?? ''
                : player.order == player3Order
                ? movements3[i] ?? ''
                : 'not implemented'
            if (player.order == player1Order) {
              movement1 = movement
              probe1 = renderProbes(currentMap, player1Order)
            }
            if (player.order == player2Order) {
              movement2 = movement
              probe2 = renderProbes(currentMap, player2Order)
            }
            if (player.order == player3Order) {
              movement3 = movement
              probe3 = renderProbes(currentMap, player3Order)
            }

            if (movement == 'l') {
              player.face = rotateCW(rotateCW(rotateCW(player.face)))
            }
            if (movement == 'r') {
              player.face = rotateCW(player.face)
            }
            if (movement == 'm') {
              const newpos = move1(player.x, player.y, player.face)
              const gridType = currentMap.grid[newpos.x][newpos.y].type
              if (
                gridType == 'block' ||
                currentMap.actors.some(
                  (a) => a.x == newpos.x && a.y == newpos.y
                )
              ) {
                player.health--
              } else {
                player.x = newpos.x
                player.y = newpos.y
              }
            }
            if (movement == 's') {
              let pos = { x: player.x, y: player.y }
              bullet: {
                for (;;) {
                  pos = move1(pos.x, pos.y, player.face)
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
          })

        currentMap.actors = currentMap.actors.filter((a) => a.health > 0)

        currentMap.actors
          .filter((x) => x.type == 'enemy')
          .forEach((enemy) => {
            let hit = false
            let pos = { x: enemy.x, y: enemy.y }
            bullet: {
              for (;;) {
                pos = move1(pos.x, pos.y, enemy.face)
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
              enemy.face = rotateCW(rotateCW(rotateCW(enemy.face)))
              // todo: change direction if obstacle
            }
          })

        currentMap.actors = currentMap.actors.filter((a) => a.health > 0)
        if (!movement1 && !movement2 && !movements3) break
        if (!'lrmws'.includes(movement1)) {
          listingEntries.push({
            map: currentMap,
            movement1: '?',
            movement2,
            movement3,
            probe1,
            probe2,
            probe3,
            lastMap,
          })
          break
        } else if (!'lrmws'.includes(movement2)) {
          listingEntries.push({
            map: currentMap,
            movement1,
            movement2: '?',
            movement3,
            probe1,
            probe2,
            probe3,
            lastMap,
          })
          break
        } else if (!'lrmws'.includes(movement3)) {
          listingEntries.push({
            map: currentMap,
            movement1,
            movement2,
            movement3: '?',
            probe1,
            probe2,
            probe3,
            lastMap,
          })
          break
        } else {
          listingEntries.push({
            map: currentMap,
            movement1,
            movement2,
            movement3,
            probe1,
            probe2,
            probe3,
            lastMap,
          })
        }
      }

      if (listingEntries.length == 0) {
        listingEntries.push({
          map,
          movement1: '',
          movement2: '',
          movement3: '',
          probe1: null,
          probe2: null,
          probe3: null,
          lastMap: map,
        })
      } else {
        if (
          listingEntries[listingEntries.length - 1].movement1 !== '?' &&
          listingEntries[listingEntries.length - 1].movement2 !== '?' &&
          listingEntries[listingEntries.length - 1].movement3 !== '?'
        ) {
          listingEntries.push({
            map: listingEntries[listingEntries.length - 1].map,
            movement1: '',
            movement2: '',
            movement3: '',
            probe1: null,
            probe2: null,
            probe3: null,
            lastMap: listingEntries[listingEntries.length - 1].map,
          })
        }
      }

      setListing(listingEntries)
    }
  }, [map, player1, player1Order, player2, player2Order, player3, player3Order])

  return (
    <div className="m-8">
      <Head>
        <title>Sketchbot Helper</title>
      </Head>
      <h1 className="text-2xl">Sketchbot Helper</h1>
      <p className="mt-4">
        Draw the map with these characters, please separate with whitespace (or{' '}
        <a
          href="https://github.com/Entkenntnis/sketchbot-helper/tree/main/levels"
          target="_blank"
          rel="noreferrer"
          className="text-blue-500 underline"
        >
          load from repo
        </a>
        , all numbers in hex):
      </p>
      <p className="mt-4">
        x = block
        <br />
        _ = empty <br /> f = finish tile
        <br />
        pNFH = player (N = order / F = n(orth = up) s(outh) e(ast) w(est) / H =
        health )
        <br />
        tNFH = target (N = order / F = face / H = health)
      </p>
      <textarea
        readOnly={map !== undefined}
        className="mt-4 border-2 w-96 h-96 font-mono read-only:outline-none read-only:select-none"
        ref={ref}
      ></textarea>
      <div>
        {map === undefined ? (
          <button
            className="mt-4 bg-green-300 p-2"
            onClick={() => {
              try {
                const map = parseInput(ref.current?.value ?? '')
                console.log(map)
                setMap(map)
              } catch (e) {
                alert(e)
              }
            }}
          >
            READ IN
          </button>
        ) : (
          <button
            className="mt-4 bg-yellow-300 p-2"
            onClick={() => {
              setMap(undefined)
            }}
          >
            EDIT
          </button>
        )}
      </div>
      {map && (
        <div className="min-h-[800px]">
          <p className="mt-6">
            Player Actions (m(ove), s(hoot), w(ait), l(eft turn), r(ight turn)):
          </p>
          <p className="mt-4">
            Player {player1Order}:
            <input
              className="border-2 ml-3 w-96 uppercase font-mono"
              value={player1}
              onChange={(event) => setPlayer1(event.target.value.toLowerCase())}
            />
          </p>
          {player2Order > 0 && (
            <p className="mt-4">
              Player {player2Order}:
              <input
                className="border-2 ml-3 w-96 uppercase font-mono"
                value={player2}
                onChange={(event) =>
                  setPlayer2(event.target.value.toLowerCase())
                }
              />
            </p>
          )}
          {player3Order > 0 && (
            <p className="mt-4">
              Player {player3Order}:
              <input
                className="border-2 ml-3 w-96 uppercase font-mono"
                value={player3}
                onChange={(event) =>
                  setPlayer3(event.target.value.toLowerCase())
                }
              />
            </p>
          )}
          <p className="my-4">
            (number of empty tiles until obstacle / E=enemy / P=friendly robot -
            F is finish tile)
          </p>
          <p className="my-4">
            <input
              type="checkbox"
              checked={showMap}
              onChange={(e) => setShowMap(e.target.checked)}
            />{' '}
            show map
          </p>
          {listing.map((l, i) => (
            <div className="mt-4 flex gap-12 items-center border" key={i}>
              <p>Turn {i + 1}</p>
              {showMap && (
                <pre className="font-mono">{printMap(l.lastMap)}</pre>
              )}
              {players.length >= 1 && l.movement1 && (
                <>
                  <p className="font-bold uppercase">{l.movement1}</p>
                  {l.probe1}
                </>
              )}
              {players.length >= 2 && l.movement1 && (
                <>
                  <p className="font-bold uppercase">{l.movement2}</p>
                  {l.probe2}
                </>
              )}
              {players.length >= 3 && l.movement1 && (
                <>
                  <p className="font-bold uppercase">{l.movement3}</p>
                  {l.probe3}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  function renderProbes(map: Map, order: number) {
    const player = map.actors.filter((x) => x.order == order)[0]
    return (
      <p>
        front: {probe(map, player.face, player.x, player.y)} back:{' '}
        {probe(map, rotateCW(rotateCW(player.face)), player.x, player.y)} left:{' '}
        {probe(
          map,
          rotateCW(rotateCW(rotateCW(player.face))),
          player.x,
          player.y
        )}{' '}
        right: {probe(map, rotateCW(player.face), player.x, player.y)}
        {/* health:{' '}
        {player.health}*/}
      </p>
    )
  }
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
