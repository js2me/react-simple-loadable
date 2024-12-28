# React Simple Loadable HOC

This is simple loadable component based on Class React Component  

## Usage  

```tsx
import { loadable } from "react-simple-loadable";

loadable(async () => {
  return (await import('./your-component')).YourNamedComponent
}, 
  SkeletonComponent
)
```

```tsx
import { loadable } from "react-simple-loadable";

loadable(async () => {
  return (await import('./your-component')).YourNamedComponent
},{
  loader: SkeletonComponent,
  extra: () => <div>renders with the lazy component</div>
})
```