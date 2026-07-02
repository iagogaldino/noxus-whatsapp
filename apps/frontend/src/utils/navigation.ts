import { useHistory } from 'react-router-dom';

export function useAppNavigate() {
  const history = useHistory();

  const navigate = (path: string, options?: { replace?: boolean }) => {
    if (options?.replace) {
      history.replace(path);
    } else {
      history.push(path);
    }
  };

  const replace = (path: string) => {
    history.replace(path);
  };

  return { navigate, replace, history };
}
