/* eslint-disable sonarjs/sonar-no-unused-class-component-methods */
/* eslint-disable sonarjs/no-unsafe */
/* eslint-disable sonarjs/public-static-readonly */
/* eslint-disable @typescript-eslint/ban-types */
import { Component, ComponentType } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LoadableComponentFunction<P = Record<string, any>> = () => Promise<
  ComponentType<P>
>;

const DefaultLoader: ComponentType = () => null;

interface LoadableConfig {
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

const getOrCreateLoadingState = (loadFn: Function) => {
  if (!loadingStates.has(loadFn)) {
    loadingStates.set(loadFn, {
      error: null,
      loading: true,
    });
  }

  return loadingStates.get(loadFn)!;
};

const updateLoadingState = (
  loadFn: Function,
  update: Partial<LoadingState>,
) => {
  const loadingState = getOrCreateLoadingState(loadFn);
  const updatedState = { ...loadingState, ...update };
  loadingStates.set(loadFn, updatedState);
  return updatedState;
};

const load = (loadFn: Function) => {
  const state = getOrCreateLoadingState(loadFn);

  if (state.result) {
    return state;
  }

  updateLoadingState(loadFn, { loading: true, error: null });

  state.loading = true;
  state.error = null;
  state.promise = loadFn()
    .then((result: any) => {
      state.loading = false;
      state.result = result;
      updateLoadingState(loadFn, state);
      return result;
    })
    .catch((error: any) => {
      state.loading = false;
      state.error = error;
      updateLoadingState(loadFn, state);
      throw error;
    });

  updateLoadingState(loadFn, state);

  return state;
};

abstract class LoadableComponentBase<P> extends Component<P, LoadingState> {
  constructor(
    private config: LoadableFullConfig,
    initialState: LoadingState,
    props: P,
  ) {
    super(props);

    this.state = initialState;
  }

  static loadFn: LoadableComponentFunction<any> = undefined as any;

  static preload() {
    load(this.loadFn);
  }

  UNSAFE_componentWillMount() {
    this.loadModule();
  }

  private loadModule() {
    if (!this.state.loading) {
      return;
    }

    const { promise } = load(this.config.loadFn);

    this.syncLoadingState();

    promise!
      .then(() => {
        this.syncLoadingState();
        return null;
      })
      .catch(() => {
        this.syncLoadingState();
        return null;
      });
  }

  syncLoadingState() {
    this.setState(getOrCreateLoadingState(this.config.loadFn));
  }

  updateLoadingState(update: Partial<LoadingState>) {
    this.setState(updateLoadingState(this.config.loadFn, update));
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

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function loadable<P = any>(
  loadFn: LoadableComponentFunction<P>,
  loaderOrConfig?: null | undefined | LoadableConfig['loader'] | LoadableConfig,
): ComponentType<P> {
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
        getOrCreateLoadingState(loadFn),
        props,
      );
    }
  }

  return LoadableComponent as any;
}
