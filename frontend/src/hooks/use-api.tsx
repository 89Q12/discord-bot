import { useContext, useMemo } from 'react';
import wretch from 'wretch';
import { UserContext } from '../state/user.context';

const instance = wretch(import.meta.env.VITE_API_URL);

export const useApi = () => {
  const user = useContext(UserContext);

  return useMemo(() => {
    const authenticated = () => {
      if (!user?.token) return instance;
      return instance.auth(`Bearer ${user?.token}`);
    };
    return authenticated().middlewares([
      (next) => async (url, opts) => {
        const response = await next(url, opts);
        if (response.status === 401) {
          user.clear();
        }
        return response;
      },
    ]);
  }, [user]);
};
