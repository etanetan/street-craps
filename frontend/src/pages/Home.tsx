import CreateGame from '../components/lobby/CreateGame';
import JoinGame from '../components/lobby/JoinGame';

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-3">Street Craps</h1>
        <p className="text-lg text-gray-400">Create a game, share the link, play with a friend</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 justify-center items-start">
        <CreateGame />
        <div className="flex items-center justify-center md:self-center">
          <div className="text-gray-600 font-medium">or</div>
        </div>
        <JoinGame />
      </div>
    </div>
  );
}
