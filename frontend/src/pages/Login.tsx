import { useNavigate, Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

export default function Login() {
  const navigate = useNavigate();
  return (
    <div className="max-w-sm mx-auto px-4 py-8 md:py-16">
      <h1 className="text-2xl font-bold text-white text-center mb-8">Sign In</h1>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <LoginForm onSuccess={() => navigate('/')} />
        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{' '}
          <Link to="/register" className="text-green-400 hover:text-green-300">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
