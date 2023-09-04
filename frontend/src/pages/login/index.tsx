import { lazy } from 'react';
import { useTitle } from '../../hooks/use-title';

const Login = lazy(() => import('./login-page'));
const Page = () => {
  useTitle('Login');
  return <Login />;
};
export default Page;
