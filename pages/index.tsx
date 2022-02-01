import clsx from 'clsx'
import Head from 'next/head'
import { createRef, useEffect, useState } from 'react'
import {
  Action,
  Map,
  parseInput,
  PlayerAction,
  printMap,
  simulate,
  SimulationResult,
} from '../src/simulation'

function readActions(str: string) {
  return str
    .toUpperCase()
    .split('')
    .filter((a) => a && 'MLRSW'.includes(a)) as Action[]
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

  const [listing, setListing] = useState<SimulationResult | undefined>()
  const [showMap, setShowMap] = useState(true)

  useEffect(() => {
    if (map) {
      const playerActions: PlayerAction[] = []
      if (player1Order > 0) {
        playerActions.push({
          order: player1Order,
          actions: readActions(player1),
        })
      }
      if (player2Order > 0) {
        playerActions.push({
          order: player2Order,
          actions: readActions(player2),
        })
      }
      if (player3Order > 0) {
        playerActions.push({
          order: player3Order,
          actions: readActions(player3),
        })
      }
      const result = simulate(map, playerActions)
      setListing(result)

      console.log(result)
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
        className={clsx(
          'mt-4 border-2 w-96 font-mono read-only:outline-none read-only:select-none',
          map ? 'h-24' : 'h-96'
        )}
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
              setPlayer1('')
              setPlayer2('')
              setPlayer3('')
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
          {listing &&
            listing.turns.map((l, i) => (
              <div className="mt-4 flex gap-12 items-center border" key={i}>
                <p>Turn {i + 1}</p>
                {showMap && <pre className="font-mono">{printMap(l.map)}</pre>}
                {l.player[player1Order] && (
                  <>
                    <p className="font-bold uppercase">
                      {l.player[player1Order].action}
                    </p>
                    {l.player[player1Order].probes}
                  </>
                )}
                {l.player[player2Order] && (
                  <>
                    <p className="font-bold uppercase">
                      {l.player[player2Order].action}
                    </p>
                    {l.player[player2Order].probes}
                  </>
                )}
                {l.player[player3Order] && (
                  <>
                    <p className="font-bold uppercase">
                      {l.player[player3Order].action}
                    </p>
                    {l.player[player3Order].probes}
                  </>
                )}
              </div>
            ))}
          {listing && listing.errorMessage && (
            <p className="mt-4 font-bold">{listing.errorMessage}</p>
          )}
        </div>
      )}
    </div>
  )
}
