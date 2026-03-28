import { useState } from 'react';
import CreateGame from '../components/lobby/CreateGame';
import JoinGame from '../components/lobby/JoinGame';

export default function Home() {
  const [tab, setTab] = useState<'create' | 'join'>('create');

  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* ── DESKTOP ── */}
      <div className="hidden md:block py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-3">Street Craps</h1>
          <p className="text-lg text-gray-400">Create a game, share the link, play with a friend</p>
        </div>
        <div className="flex flex-row gap-6 justify-center items-start">
          <CreateGame />
          <div className="flex items-center self-center">
            <div className="text-gray-600 font-medium">or</div>
          </div>
          <JoinGame />
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="md:hidden flex flex-col min-h-screen py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-1">Street Craps</h1>
          <p className="text-sm text-gray-400">Create a game, share the link, play with a friend</p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-gray-900 border border-gray-700 rounded-xl p-1 mb-4">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'create' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Create Game
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'join' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Join Game
          </button>
        </div>

        <div className="flex-1">
          {tab === 'create' ? <CreateGame /> : <JoinGame />}
        </div>
      </div>
    </div>
  );
}
