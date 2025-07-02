import React, { useState } from 'react';
import { Square } from 'lucide-react';
import './App.css';

const colors = ['white', '#f87171', '#60a5fa', '#34d399', '#fbbf24'];

function nextColor(current) {
  const idx = colors.indexOf(current);
  return colors[(idx + 1) % colors.length];
}

export default function PresheafVisualization() {
  const [showExample, setShowExample] = useState(false);
  const [graphGColorings, setGraphGColorings] = useState(['white', 'white', 'white']);
  const [graphHColorings, setGraphHColorings] = useState(['white', 'white']);

  const resetGraphs = (advanced) => {
    if (advanced) {
      setGraphGColorings(['white', 'white', 'white']);
      setGraphHColorings(['white', 'white']);
    } else {
      setGraphGColorings(['white', 'white']);
      setGraphHColorings(['white']);
    }
  };

  const toggleExample = () => {
    const adv = !showExample;
    setShowExample(adv);
    resetGraphs(adv);
  };

  const changeColor = (graph, index) => {
    if (graph === 'G') {
      setGraphGColorings(prev => {
        const arr = [...prev];
        arr[index] = nextColor(arr[index]);
        return arr;
      });
    } else {
      setGraphHColorings(prev => {
        const arr = [...prev];
        arr[index] = nextColor(arr[index]);
        return arr;
      });
    }
  };

  const applyPresheaf = () => {
    if (showExample) {
      // v1 -> w1, v2 -> w2, v3 -> w1
      setGraphGColorings([
        graphHColorings[0],
        graphHColorings[1],
        graphHColorings[0],
      ]);
    } else {
      // both v1 and v2 map to w1
      setGraphGColorings([
        graphHColorings[0],
        graphHColorings[0],
      ]);
    }
  };

  return (
    <div className="app-container">
      <h1 className="text-xl font-bold text-center mb-4">Presheaf Visualization</h1>
      <div className="text-center mb-4">
        <label className="mr-2">
          <input type="checkbox" checked={showExample} onChange={toggleExample} />{' '}Show advanced example
        </label>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Graph G */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-center">Graph G</h2>
          <div className="w-40 h-40 relative mx-auto">
            {showExample ? (
              // Advanced example: Path P3
              <>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '10%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('G', 0)}
                >
                  <Square fill={graphGColorings[0]} color="black" size={40} />
                  <div className="text-center mt-1">v1</div>
                </div>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '45%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('G', 1)}
                >
                  <Square fill={graphGColorings[1]} color="black" size={40} />
                  <div className="text-center mt-1">v2</div>
                </div>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', right: '10%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('G', 2)}
                >
                  <Square fill={graphGColorings[2]} color="black" size={40} />
                  <div className="text-center mt-1">v3</div>
                </div>
                <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: -1 }}>
                  <line x1="30" y1="70" x2="70" y2="70" stroke="black" strokeWidth="2" />
                  <line x1="110" y1="70" x2="150" y2="70" stroke="black" strokeWidth="2" />
                </svg>
              </>
            ) : (
              <>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '25%', transform: 'translate(-50%, -50%)' }}
                  onClick={() => changeColor('G', 0)}
                >
                  <Square fill={graphGColorings[0]} color="black" size={50} />
                  <div className="text-center mt-1">v1</div>
                </div>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', right: '25%', transform: 'translate(50%, -50%)' }}
                  onClick={() => changeColor('G', 1)}
                >
                  <Square fill={graphGColorings[1]} color="black" size={50} />
                  <div className="text-center mt-1">v2</div>
                </div>
              </>
            )}
          </div>
          <button
            onClick={applyPresheaf}
            className="mt-3 w-full bg-green-600 text-white px-3 py-1 rounded text-sm"
          >
            Pull Back Coloring
          </button>
          <div className="mt-3 text-xs text-center">
            Always works! F(f): F(H) → F(G)
          </div>
        </div>

        {/* Graph H */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-center">Graph H</h2>
          <div className="w-40 h-40 relative mx-auto">
            {showExample ? (
              <>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '30%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('H', 0)}
                >
                  <Square fill={graphHColorings[0]} color="black" size={40} />
                  <div className="text-center mt-1">w1</div>
                </div>
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', right: '30%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('H', 1)}
                >
                  <Square fill={graphHColorings[1] || graphHColorings[0]} color="black" size={40} />
                  <div className="text-center mt-1">w2</div>
                </div>
                <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: -1 }}>
                  <line x1="50" y1="70" x2="90" y2="70" stroke="black" strokeWidth="2" />
                </svg>
              </>
            ) : (
              <div
                className="absolute cursor-pointer"
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                onClick={() => changeColor('H', 0)}
              >
                <Square fill={graphHColorings[0]} color="black" size={50} />
                <div className="text-center mt-1">w1</div>
              </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <div className="font-semibold mb-2">F(H): Set of Colorings</div>
            <div className="text-sm">
              {showExample
                ? 'Proper colorings of edge K2 (endpoints have different colors)'
                : 'Any single color'}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">The Presheaf Principle</h2>
        <p className="mb-3">
          Why does the presheaf go in the opposite direction? Because colorings <strong>pull back</strong> along valid graph morphisms:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2">
            <strong>Simple example</strong>: The morphism f maps an independent set (2 isolated nodes) to a single node. 
            Since there are no edges in G, any coloring can be pushed forward, but pullbacks always work.
          </li>
          <li className="mb-2">
            <strong>Advanced example</strong>: The morphism f maps a path P3 (v1-v2-v3) to an edge K2 (w1-w2) via v1→w1, v2→w2, v3→w1.
            This preserves adjacency since edges v1-v2 and v2-v3 map to edges w1-w2 and w2-w1.
          </li>
          <li>
            Given any proper coloring of H, we can always pull it back to get a valid coloring of G. 
            However, not every coloring of G can be pushed forward to H due to the constraints of the morphism.
          </li>
        </ul>
        <p>
          This is why presheaves are defined as functors from the <strong>opposite</strong> category 
          — they capture how structures naturally pull back rather than push forward.
        </p>
      </div>
    </div>
  );
}
