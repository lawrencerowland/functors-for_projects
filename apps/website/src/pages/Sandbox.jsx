import ToolTile from '../components/ToolTile.jsx';

export default function Sandbox() {
  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl">Interactive Tools Sandbox</h1>
      <p className="font-sans">The Interactive Tools Sandbox is your playground for hands-on innovation. Here, you’ll find a collection of quick, plug-and-play tools that help teams think through problems and test ideas in real time. From control-signal tiles (small interactive cards surfacing key insights) to sandbox workbenches for trying out AI-driven scenarios, each tool is designed to be lightweight and intuitive. For example, you might open a visual use case mapper to sketch out a process flow, or use a prompt editor to generate a first draft of a plan. Each tool comes with simple instructions and sample data so you can start experimenting instantly. This sandbox lets you fail fast and learn fast – feel free to explore different tools, adjust parameters, and discover new perspectives, all in a safe environment that’s separate from any live project systems.</p>
      <div className="grid grid-cols-2 gap-4 mt-4">
        <ToolTile>Signal Tile</ToolTile>
        <ToolTile>Workbench</ToolTile>
      </div>
    </div>
  );
}
