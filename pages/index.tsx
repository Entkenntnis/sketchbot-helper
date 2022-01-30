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
  }[]
}

function parseInput(input: string) {
  const linesRaw = input.split('\n')
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
        const order = parseInt(val.charAt(1))
        const face = val.charAt(2) as Face
        const health = parseInt(val.charAt(3))
        if (!'nesw'.includes(face)) throw 'player face invalid'
        actors.push({ type: 'player', order, x, y, face, health })
      }
      if (val.startsWith('t')) {
        if (val.length !== 4) throw 'malformed target tag'
        const order = parseInt(val.charAt(1))
        const face = val.charAt(2) as Face
        const health = parseInt(val.charAt(3))
        if (!'news'.includes(face)) throw 'player face invalid'
        actors.push({ type: 'target', order, x, y, face, health })
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

  const playerCount =
    map == undefined ? 0 : map.actors.filter((a) => a.type == 'player').length

  const [player1, setPlayer1] = useState<string>('')

  const [listing, setListing] = useState<ListingEntry[]>([])

  useEffect(() => {
    if (map) {
      const movements1 = player1.split('').filter((a) => a)

      const listingEntries: ListingEntry[] = []

      for (const movement of movements1) {
        const lastMap =
          listingEntries.length == 0
            ? map
            : listingEntries[listingEntries.length - 1].map

        const currentMap = JSON.parse(JSON.stringify(lastMap)) as Map

        const players = currentMap.actors.filter((x) => x.type == 'player')

        // resolve player action
        if (movement == 'l') {
          players[0].face = rotateCW(rotateCW(rotateCW(players[0].face)))
        }
        if (movement == 'r') {
          players[0].face = rotateCW(players[0].face)
        }
        if (movement == 'm') {
          const newpos = move1(players[0].x, players[0].y, players[0].face)
          const gridType = currentMap.grid[newpos.x][newpos.y].type
          if (gridType == 'block') {
            players[0].health--
          } else {
            players[0].x = newpos.x
            players[0].y = newpos.y
          }
        }

        if (!'lrmws'.includes(movement)) {
          listingEntries.push({ map: currentMap, movement1: '?', lastMap })
          break
        }

        listingEntries.push({ map: currentMap, movement1: movement, lastMap })
      }
      const lastMap =
        listingEntries.length == 0
          ? map
          : listingEntries[listingEntries.length - 1].map
      listingEntries.push({ map: lastMap, movement1: '', lastMap })

      setListing(listingEntries)
    }
  }, [map, player1])

  return (
    <div className="m-8">
      <Head>
        <title>Sketchbot Helper</title>
      </Head>
      <h1 className="text-2xl">Sketchbot Helper</h1>
      <p className="mt-4">
        Draw the map with these characters, please separate with whitespace:
      </p>
      <p className="mt-4">
        x = block
        <br />
        _ = empty <br /> f = finish tile
        <br />
        pNDH = player (N = order / D = n(orth = up) s(outh) e(ast) w(est) / H =
        health )
        <br />
        tNDH = target (N = order / D= face / H = health)
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
            Player Actions (m(ove), s(hoot), w(ait), l(eft turn), r(ight turn),
            separate with whitespace):
          </p>
          <p className="mt-4">
            Player 1:
            <input
              className="border-2 ml-3 w-96 uppercase"
              value={player1}
              onChange={(event) => setPlayer1(event.target.value.toLowerCase())}
            />
          </p>
          {listing.map((l, i) => (
            <div className="mt-4 flex gap-12 items-center border">
              <p>Turn {i + 1}</p>
              <pre className="mt-2 font-mono">{printMap(l.lastMap)}</pre>
              <p className="mt-4 font-bold uppercase">{l.movement1}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
