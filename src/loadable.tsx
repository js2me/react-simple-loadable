import { Component, ComponentType, ReactNode } from 'react';

export type LoadComponentFn<P = Record<string, any>> = () => Promise<
  ComponentType<P>
>;

export type LoadableMixin = {
  preload(): void;
};

export type LoadableComponent<P = Record<string, any>> = ((
  props: P,
) => ReactNode) &
  LoadableMixin;

const DefaultLoadingComponent: ComponentType = () => null;

export interface LoadingComponentProps {
  error?: any;
  isLoading?: boolean;
}

export type LoadingComponent = ComponentType<LoadingComponentProps>;

export interface LoadableConfig {
  throwOnError?: boolean;
  loading?: LoadingComponent | ComponentType<Record<string, any>>;
  /**
   * @deprecated use {loading}
   */
  loader?: LoadingComponent | ComponentType<Record<string, any>>;
  /**
   * Component which renders with the lazy component
   */
  extra?: ComponentType<any>;
}

export interface LoadableConfigWithLoad<P = any> extends LoadableConfig {
  load: LoadComponentFn<P>;
}

type LoadingState = {
  error: any;
  loading: boolean;
  result?: ComponentType<any>;
  promise?: Promise<any>;
};

const loadingStates = new WeakMap<LoadComponentFn<any>, LoadingState>();

const getLoadingState = (
  loadFn: LoadComponentFn<any>,
  modify?: Partial<LoadingState>,
) => {
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

const load = (loadFn: LoadComponentFn<any>) => {
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
    private config: LoadableConfigWithLoad,
    props: P,
  ) {
    super(props);

    this.state = getLoadingState(config.load);
  }

  static loadFn: LoadComponentFn<any> = undefined as any;

  static preload() {
    load(this.loadFn);
  }

  UNSAFE_componentWillMount() {
    if (!this.state.loading) {
      return;
    }

    const { promise } = load(this.config.load);

    this.setState(getLoadingState(this.config.load));

    promise!.finally(() => {
      this.setState(getLoadingState(this.config.load));
    });
  }

  render() {
    const { loading, loader, throwOnError } = this.config;
    const Loader = loading || loader || DefaultLoadingComponent;

    if (throwOnError && this.state.error) {
      throw this.state.error;
    }

    if (this.state.loading || this.state.error) {
      const loaderProps = {
        ...this.props,
      } as any;

      if (this.state.error) {
        loaderProps.error = this.state.error;
      } else if (!loaderProps.isLoading) {
        loaderProps.isLoading = true;
      }

      return <Loader {...loaderProps} />;
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

export const loadableDefaultConfig: Partial<LoadableConfig> = {
  throwOnError: false,
};

export function loadable<P = any>(
  config: LoadableConfigWithLoad<P>,
): LoadableComponent$<P>;
export function loadable<P = any>(
  load: LoadComponentFn<P>,
  loadingOrConfig?:
    | null
    | undefined
    | LoadableConfig['loading']
    | LoadableConfig,
): LoadableComponent$<P>;

export function loadable(...args: any[]): LoadableComponent$<any> {
  const config = {
    ...loadableDefaultConfig,
  } as LoadableConfigWithLoad;

  if (args.length === 1) {
    Object.assign(config, args[0]);
  } else {
    config.load = args[0];
    if (typeof args[1] === 'function') {
      config.loading = args[1];
    } else {
      Object.assign(config, args[1] || {});
    }
  }

  class LoadableComponent extends LoadableComponentBase<any> {
    static loadFn = config.load;

    constructor(props: any) {
      super(config, props);
    }
  }

  return LoadableComponent as any;
}
