import { createRef, useState } from 'react'

interface Map {
  width: number
  height: number
  grid: {
    type: 'empty' | 'block' | 'finish'
  }[][]
  actors: {
    type: 'player' | 'target' | 'enemy'
    health: number
    face: 'u' | 'd' | 'l' | 'r'
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
        const face = val.charAt(2) as 'u' | 'd' | 'l' | 'r'
        const health = parseInt(val.charAt(3))
        if (!'udlr'.includes(face)) throw 'player face invalid'
        actors.push({ type: 'player', order, x, y, face, health })
      }
      if (val.startsWith('t')) {
        if (val.length !== 4) throw 'malformed target tag'
        const order = parseInt(val.charAt(1))
        const face = val.charAt(2) as 'u' | 'd' | 'l' | 'r'
        const health = parseInt(val.charAt(3))
        if (!'udlr'.includes(face)) throw 'player face invalid'
        actors.push({ type: 'target', order, x, y, face, health })
      }
    }
  }

  actors.sort((a, b) => {
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

export default function Home() {
  const ref = createRef<HTMLTextAreaElement>()
  const [map, setMap] = useState<Map | undefined>(undefined)

  return (
    <div className="m-8">
      <h1 className="text-2xl">Sketchbot Helper</h1>
      <p className="mt-4">
        Draw the map with these characters, please separate with whitespace:
      </p>
      <p className="mt-4">
        x = block, _ = empty, pNDH = player (N = order / D = u(p) d(own) l(eft)
        r(ight) / H = health ), f = finish tile, tNDH = target (N = order / H =
        health)
      </p>
      <textarea
        readOnly={map !== undefined}
        className="mt-4 border-2 w-96 h-96 font-mono"
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
        <div>
          <p className="mt-4 underline">Turn 1:</p>
          <pre className="mt-2 font-mono">{printMap(map)}</pre>
        </div>
      )}
    </div>
  )
}
