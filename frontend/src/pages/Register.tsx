import { useNavigate, Link } from 'react-router-dom';
import RegisterForm from '../components/auth/RegisterForm';

export default function Register() {
  const navigate = useNavigate();
  return (
    <div className="max-w-sm mx-auto px-4 py-8 md:py-16">
      <h1 className="text-2xl font-bold text-white text-center mb-8">Create Account</h1>
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-6">
        <RegisterForm onSuccess={() => navigate('/')} />
        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-green-400 hover:text-green-300">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
