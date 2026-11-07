import { useState } from 'react';

function useExample(initialValue = '') {
  const [value, setValue] = useState(initialValue);

  return { value, setValue };
}

export default useExample;