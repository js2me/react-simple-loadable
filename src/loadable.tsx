/* eslint-disable sonarjs/sonar-no-unused-class-component-methods */
/* eslint-disable sonarjs/no-unsafe */
/* eslint-disable sonarjs/public-static-readonly */
/* eslint-disable @typescript-eslint/ban-types */
import { Component, ComponentType } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadComponentFn<P = Record<string, any>> = () => Promise<
  ComponentType<P>
>;

export type LoadableMixin = {
  preload(): void;
};

export type LoadableComponent<P = Record<string, any>> = ComponentType<P> &
  LoadableMixin;

const DefaultLoader: ComponentType = () => null;

export interface LoadableConfig {
  loader?: ComponentType<any>;
  /**
   * Component which renders with the lazy component
   */
  extra?: ComponentType<any>;
}

interface LoadableFullConfig extends LoadableConfig {
  loadFn: () => Promise<any>;
}

type LoadingState = {
  error: any;
  loading: boolean;
  result?: ComponentType<any>;
  promise?: Promise<any>;
};

const loadingStates = new WeakMap<Function, LoadingState>();

const getLoadingState = (loadFn: Function, modify?: Partial<LoadingState>) => {
  if (!loadingStates.has(loadFn)) {
    loadingStates.set(loadFn, {
      error: null,
      loading: true,
    });
  }

  const loadingState = loadingStates.get(loadFn)!;

  if (modify == null) {
    return loadingState;
  }

  const updatedState = { ...loadingState, ...modify };
  loadingStates.set(loadFn, updatedState);
  return updatedState;
};

const load = (loadFn: Function) => {
  const state = getLoadingState(loadFn);

  if (state.result) {
    return state;
  }

  getLoadingState(loadFn, { loading: true, error: null });

  state.loading = true;
  state.error = null;
  state.promise = loadFn()
    .then((result: any) => {
      state.loading = false;
      state.result = result;
      getLoadingState(loadFn, state);
      return result;
    })
    .catch((error: any) => {
      state.loading = false;
      state.error = error;
      getLoadingState(loadFn, state);
      throw error;
    });

  getLoadingState(loadFn, state);

  return state;
};

abstract class LoadableComponentBase<P> extends Component<P, LoadingState> {
  constructor(
    private config: LoadableFullConfig,
    props: P,
  ) {
    super(props);

    this.state = getLoadingState(config.loadFn);
  }

  static loadFn: LoadComponentFn<any> = undefined as any;

  static preload() {
    load(this.loadFn);
  }

  UNSAFE_componentWillMount() {
    if (!this.state.loading) {
      return;
    }

    const { promise } = load(this.config.loadFn);

    this.setState(getLoadingState(this.config.loadFn));

    promise!
      .then(() => {
        this.setState(getLoadingState(this.config.loadFn));
        return null;
      })
      .catch(() => {
        this.setState(getLoadingState(this.config.loadFn));
        return null;
      });
  }

  render() {
    const { loader } = this.config;
    const Loader = loader || DefaultLoader;

    if (this.state.loading || this.state.error) {
      return <Loader {...this.props} />;
    } else if (this.state.result) {
      const Component = this.state.result;
      const Extra = this.config.extra;
      return (
        <>
          <Component {...this.props} />
          {Extra && <Extra />}
        </>
      );
    } else {
      return null;
    }
  }
}

type LoadableComponent$<P> = LoadableComponent<P>;

export function loadable<P = any>(
  loadFn: LoadComponentFn<P>,
  loaderOrConfig?: null | undefined | LoadableConfig['loader'] | LoadableConfig,
): LoadableComponent$<P> {
  const config =
    typeof loaderOrConfig === 'object'
      ? loaderOrConfig
      : { loader: loaderOrConfig };

  class LoadableComponent extends LoadableComponentBase<P> {
    loadFn = loadFn;

    constructor(props: P) {
      super(
        {
          loadFn,
          ...config,
        },
        props,
      );
    }
  }

  return LoadableComponent as any;
}
