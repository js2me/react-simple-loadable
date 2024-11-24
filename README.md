# React Simple Loadable HOC

This is simple ErrorBoundary component    

## Usage  

```tsx
import { loadable } from "react-simple-loadable";

loadable(async () => {
  return (await import('./your-component')).YourNamedComponent
}, 
  SkeletonComponent
)
```