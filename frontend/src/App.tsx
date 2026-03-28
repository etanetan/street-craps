import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './store/store';
import { refreshToken } from './store/authSlice';
import Header from './components/shared/Header';
import Home from './pages/Home';
import Game from './pages/Game';
import Login from './pages/Login';
import Register from './pages/Register';
import Stats from './pages/Stats';
import JoinGame from './components/lobby/JoinGame';

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout><AppWithJoin /></Layout>} />
        <Route path="/game/:code" element={<Game />} />
        <Route path="/login" element={<Layout><Login /></Layout>} />
        <Route path="/register" element={<Layout><Register /></Layout>} />
        <Route path="/stats" element={<Layout><Stats /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

function AppWithJoin() {
  const dispatch = useDispatch<AppDispatch>();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join');

  useEffect(() => {
    dispatch(refreshToken());
  }, []);

  if (joinCode) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <JoinGame initialCode={joinCode} />
      </div>
    );
  }

  return <Home />;
}
