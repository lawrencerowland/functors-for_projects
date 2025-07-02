import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Projects from './pages/Projects.jsx';
import Sandbox from './pages/Sandbox.jsx';
import AITools from './pages/AITools.jsx';
import Systems from './pages/Systems.jsx';
import Lifecycle from './pages/Lifecycle.jsx';
import Insights from './pages/Insights.jsx';
import './styles/globals.css';

function Navbar() {
  return (
    <nav className="flex flex-wrap justify-around gap-x-8 p-4 border-b mb-4">
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/">Home</Link>
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/projects">Projects</Link>
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/sandbox">Tools Sandbox</Link>
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/ai-tools">AI Tools</Link>
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/systems">Systems Thinking</Link>
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/lifecycle">Lifecycle</Link>
      <Link className="hover:text-accent-600 hover:underline decoration-2" to="/insights">Insights</Link>
      <a className="hover:text-accent-600 hover:underline decoration-2" href="../../app-index.html">App Index</a>
    </nav>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Navbar />
      <div className="container mx-auto px-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/sandbox" element={<Sandbox />} />
          <Route path="/ai-tools" element={<AITools />} />
          <Route path="/systems" element={<Systems />} />
          <Route path="/lifecycle" element={<Lifecycle />} />
          <Route path="/insights" element={<Insights />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
