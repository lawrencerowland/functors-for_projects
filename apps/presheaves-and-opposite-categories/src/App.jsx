import React, { useState } from 'react';
import { Circle, Square, ArrowRight, RotateCcw } from 'lucide-react';
import './App.css';

const colors = ['red', 'blue', 'green', 'purple', 'orange'];

export default function PresheafVisualization() {
  // Start with the simple example by default (2 nodes in G, 1 node in H)
  const [graphGColorings, setGraphGColorings] = useState(['red', 'blue']);
  const [graphHColorings, setGraphHColorings] = useState(['red']);
  const [showExample, setShowExample] = useState(false);

  const toggleExample = () => {
    const nowShowingAdvanced = !showExample;
    setShowExample(nowShowingAdvanced);
    if (nowShowingAdvanced) {
      // Switching to advanced example: Path P3 (3 nodes) and Edge K2 (2 nodes)
      setGraphGColorings(['red', 'blue', 'red']);
      setGraphHColorings(['red', 'blue']);
    } else {
      // Switching to simple example: independent set (2 nodes) and single node
      setGraphGColorings(['red', 'blue']);
      setGraphHColorings(['red']);
    }
  };

  const applyMorphism = () => {
    if (!showExample) {
      // Simple example (independent set → single node):
      // Push forward: both v1,v2 map to w1. (No adjacency constraints in G, so any coloring can push forward)
      setGraphHColorings([graphGColorings[0]]);
    } else {
      // Advanced example (path P3 → edge K2):
      // f: v1→w1, v2→w2, v3→w1. Push forward only if v1 and v3 have the same color (≠ v2).
      if (
        graphGColorings[0] === (graphGColorings[2] || graphGColorings[0]) &&
        graphGColorings[0] !== graphGColorings[1]
      ) {
        // Valid push-forward: set w1 = color of v1 (and v3), w2 = color of v2
        setGraphHColorings([graphGColorings[0], graphGColorings[1]]);
      } else {
        alert(
          'Cannot push forward this coloring! For the morphism f: v1→w1, v2→w2, v3→w1 to work, nodes v1 and v3 must have the same color (different from v2).'
        );
      }
    }
  };

  const applyPresheaf = () => {
    if (!showExample) {
      // Simple example pull-back: copy the single w1 color to both v1 and v2
      const pulledColor = graphHColorings[0];
      setGraphGColorings([pulledColor, pulledColor]);
    } else {
      // Advanced example pull-back: for f: v1→w1, v2→w2, v3→w1,
      // any coloring of H (w1,w2) pulls back to v1=v3=w1's color, v2=w2's color.
      const pulledBackColors = [
        graphHColorings[0],
        graphHColorings[1] || graphHColorings[0],
        graphHColorings[0],
      ];
      setGraphGColorings(pulledBackColors);
    }
  };

  const changeColor = (graph, index) => {
    // Cycle the color of a given node to the next in the palette
    const setColors = graph === 'G' ? setGraphGColorings : setGraphHColorings;
    const currentColors = graph === 'G' ? graphGColorings : graphHColorings;
    const newColors = [...currentColors];
    const currentIndex = colors.indexOf(newColors[index]);
    const nextIndex = (currentIndex + 1) % colors.length;
    newColors[index] = colors[nextIndex];
    setColors(newColors);
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg h-full">
      <h1 className="text-2xl font-bold mb-4 text-center">
        Presheaf Visualization
      </h1>

      {/* Toggle between simple vs advanced example */}
      <div className="flex justify-center mb-4">
        <button
          onClick={toggleExample}
          className="flex items-center bg-purple-600 text-white px-4 py-2 rounded font-medium"
        >
          <RotateCcw size={16} className="mr-2" />
          {showExample ? 'Show Simple Example' : 'Show Advanced Example'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 justify-center items-center">
        {/* Graph G display */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-center">Graph G</h2>
          <div className="w-40 h-40 relative mx-auto">
            {showExample ? (
              /** Advanced example: Path graph P3 (v1--v2--v3) **/
              <>
                {/* Node v1 (left) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '10px', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('G', 0)}
                >
                  <Circle fill={graphGColorings[0]} color="black" size={40} />
                  <div className="text-center mt-1">v1</div>
                </div>
                {/* Node v2 (middle) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                  onClick={() => changeColor('G', 1)}
                >
                  <Circle fill={graphGColorings[1]} color="black" size={40} />
                  <div className="text-center mt-1">v2</div>
                </div>
                {/* Node v3 (right) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', right: '10px', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('G', 2)}
                >
                  <Circle
                    fill={graphGColorings[2] || graphGColorings[1]}
                    color="black"
                    size={40}
                  />
                  <div className="text-center mt-1">v3</div>
                </div>
                {/* Edges for P3 (two line segments) */}
                <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: -1 }}>
                  <line x1="30" y1="70" x2="70" y2="70" stroke="black" strokeWidth="2" />
                  <line x1="90" y1="70" x2="130" y2="70" stroke="black" strokeWidth="2" />
                </svg>
              </>
            ) : (
              /** Simple example: Independent set (two separate nodes) **/
              <>
                {/* Node v1 (top) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '20px', left: '50%', transform: 'translateX(-50%)' }}
                  onClick={() => changeColor('G', 0)}
                >
                  <Circle fill={graphGColorings[0]} color="black" size={40} />
                  <div className="text-center mt-1">v1</div>
                </div>
                {/* Node v2 (bottom) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ bottom: '20px', left: '50%', transform: 'translateX(-50%)' }}
                  onClick={() => changeColor('G', 1)}
                >
                  <Circle fill={graphGColorings[1]} color="black" size={40} />
                  <div className="text-center mt-1">v2</div>
                </div>
              </>
            )}
          </div>
          {/* Description of F(G) */}
          <div className="mt-4 text-center">
            <div className="font-semibold mb-2">F(G): Set of Colorings</div>
            <div className="text-sm">
              {showExample
                ? 'Proper colorings of path P3 (adjacent nodes different colors)'
                : 'Any colorings of independent set (no adjacency constraints)'}
            </div>
          </div>
        </div>

        {/* Morphism (category vs opposite category) controls */}
        <div className="flex flex-col items-center justify-center gap-4">
          {/* Original category morphism (G -> H) */}
          <div className="bg-white p-4 rounded-lg shadow-lg w-48">
            <h3 className="text-center font-medium mb-2">Original Category</h3>
            <div className="flex items-center justify-center">
              <span className="font-mono">f: G → H</span>
              <ArrowRight className="ml-2" size={20} />
            </div>
            <button
              onClick={applyMorphism}
              className="mt-3 w-full bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Try Push Forward
            </button>
            <div className="mt-3 text-xs text-center">
              {showExample ? 'f: v1→w1, v2→w2, v3→w1' : 'f: v1,v2 → w1'}
            </div>
          </div>

          {/* Opposite category morphism (F(f): F(H) -> F(G)) */}
          <div className="bg-white p-4 rounded-lg shadow-lg w-48">
            <h3 className="text-center font-medium mb-2">Opposite Category</h3>
            <div className="flex items-center justify-center">
              <span className="font-mono">F(f): F(H) → F(G)</span>
              <ArrowRight className="ml-2" size={20} />
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
        </div>

        {/* Graph H display */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-lg font-semibold mb-3 text-center">Graph H</h2>
          <div className="w-40 h-40 relative mx-auto">
            {showExample ? (
              /** Advanced example: Edge K2 (two nodes w1--w2) **/
              <>
                {/* Node w1 (left) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', left: '30%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('H', 0)}
                >
                  <Square fill={graphHColorings[0]} color="black" size={40} />
                  <div className="text-center mt-1">w1</div>
                </div>
                {/* Node w2 (right) */}
                <div
                  className="absolute cursor-pointer"
                  style={{ top: '50%', right: '30%', transform: 'translateY(-50%)' }}
                  onClick={() => changeColor('H', 1)}
                >
                  <Square
                    fill={graphHColorings[1] || graphHColorings[0]}
                    color="black"
                    size={40}
                  />
                  <div className="text-center mt-1">w2</div>
                </div>
                {/* Edge for K2 */}
                <svg className="absolute top-0 left-0 w-full h-full" style={{ zIndex: -1 }}>
                  <line x1="50" y1="70" x2="90" y2="70" stroke="black" strokeWidth="2" />
                </svg>
              </>
            ) : (
              /** Simple example: Single node **/
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
          {/* Description of F(H) */}
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

      {/* Explanatory section: The Presheaf Principle */}
      <div className="mt-8 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">The Presheaf Principle</h2>
        <p className="mb-3">
          Why does the presheaf go in the opposite direction? Because colorings
          <strong>pull back</strong> along valid graph morphisms:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li className="mb-2">
            <strong>Simple example</strong>: The morphism f maps an independent set (2 isolated nodes) to a single node. 
            Since there are no edges in G, any coloring can be pushed forward, but pullbacks always work.
          </li>
          <li className="mb-2">
            <strong>Advanced example</strong>: The morphism f maps a path P3 (v1–v2–v3) to an edge K2 (w1–w2) via v1→w1, v2→w2, v3→w1. 
            This preserves adjacency since edges v1–v2 and v2–v3 map to edges w1–w2 and w2–w1.
          </li>
          <li>
            Given any proper coloring of H, we can always pull it back to get a valid coloring of G. 
            However, not every coloring of G can be pushed forward to H due to the constraints of the morphism.
          </li>
        </ul>
        <p>
          This is why presheaves are defined as functors from the <strong>opposite</strong> category — they capture how structures naturally pull back rather than push forward.
        </p>
      </div>
    </div>
  );
}
