import find from 'lodash/find';
import get from 'lodash/get';
import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from 'redux';
import {
  fetchOfflineMode,
  removeActionFromQueue,
  dismissActionsFromQueue,
} from './actionCreators';
import wait from '../utils/wait';
import { NetworkState, EnqueuedAction } from '../types';

type GetState = MiddlewareAPI<Dispatch, State>['getState'];
type State = {
  network: NetworkState;
};
type ActionType = Array<string> | string;
type Arguments = {
  regexActionType: RegExp;
  actionTypes: ActionType;
  queueReleaseThrottle: number;
  shouldDequeueSelector: (state: State) => boolean;
};

const DEFAULT_ARGUMENTS: Arguments = {
  actionTypes: [],
  regexActionType: /FETCH.*REQUEST/,
  queueReleaseThrottle: 50,
  shouldDequeueSelector: () => true,
};

// because I don't know how many middlewares would be added, thunk, oberservable etc
type StoreDispatch = (...args: any[]) => any;

function validateParams(regexActionType: RegExp, actionTypes: ActionType) {
  if ({}.toString.call(regexActionType) !== '[object RegExp]')
    throw new Error('You should pass a regex as regexActionType param');

  if ({}.toString.call(actionTypes) !== '[object Array]')
    throw new Error('You should pass an array as actionTypes param');
}

function findActionToBeDismissed(
  action: AnyAction,
  actionQueue: EnqueuedAction[],
) {
  return find(actionQueue, a => {
    const actionsToDismiss = get(a, 'meta.dismiss', []);
    return actionsToDismiss.includes(action.type);
  });
}

function isObjectAndShouldBeIntercepted(
  action: EnqueuedAction,
  regexActionType: RegExp,
  actionTypes: ActionType,
) {
  if (typeof action === 'object' && 'type' in action) {
    return (
      regexActionType.test(action.type) || actionTypes.includes(action.type)
    );
  }
  return false;
}

function isThunkAndShouldBeIntercepted(action: EnqueuedAction) {
  return typeof action === 'function' && action.interceptInOffline === true;
}

function checkIfActionShouldBeIntercepted(
  action: EnqueuedAction,
  regexActionType: RegExp,
  actionTypes: ActionType,
): boolean {
  return (
    isObjectAndShouldBeIntercepted(action, regexActionType, actionTypes) ||
    isThunkAndShouldBeIntercepted(action)
  );
}

let isQueueInProgress = false;

export const createReleaseQueue = (
  getState: GetState,
  next: StoreDispatch,
  delay: number,
) => async () => {
  // eslint-disable-next-line
  while (true) {
    const state = getState();

    const { isConnected, isQueuePaused, actionQueue } = state.network;

    if (
      actionQueue &&
      actionQueue.length > 0 &&
      isConnected &&
      !isQueuePaused
    ) {
      const action = actionQueue[0];
      // TODO: add flag to meta details for thunks which should be automatically/manually removed from queue
      // TODO: add action dismissing to required thunk success/error handlers
      next(removeActionFromQueue(action));
      next(action);
      // eslint-disable-next-line
      await wait(delay);
    } else {
      isQueueInProgress = false;
      break;
    }
  }
};

function createNetworkMiddleware({
  regexActionType = DEFAULT_ARGUMENTS.regexActionType,
  actionTypes = DEFAULT_ARGUMENTS.actionTypes,
  queueReleaseThrottle = DEFAULT_ARGUMENTS.queueReleaseThrottle,
  shouldDequeueSelector = DEFAULT_ARGUMENTS.shouldDequeueSelector,
}: Partial<Arguments> = {}): Middleware<{}, State, Dispatch> {
  return ({ getState }: MiddlewareAPI<Dispatch, State>) => (
    next: StoreDispatch,
  ) => (action: EnqueuedAction) => {
    const { isConnected, actionQueue, isQueuePaused } = getState().network;
    const releaseQueue = createReleaseQueue(
      getState,
      next,
      queueReleaseThrottle,
    );
    validateParams(regexActionType, actionTypes);

    const shouldInterceptAction = checkIfActionShouldBeIntercepted(
      action,
      regexActionType,
      actionTypes,
    );

    if (shouldInterceptAction) {
      // Dispatching an internal action instead.
      return next(fetchOfflineMode(action));
    }
    const shouldDequeue =
      isConnected && isQueuePaused && shouldDequeueSelector(getState());

    if (shouldDequeue && !isQueueInProgress) {
      // Dispatching queued actions in order of arrival (if we have any)
      next(action);
      isQueueInProgress = true;
      return releaseQueue();
    }

    // Checking if we have a dismissal case
    // narrow down type from thunk to only pass in actions with type -> AnyAction
    if ('type' in action) {
      const isAnyActionToBeDismissed = findActionToBeDismissed(
        action,
        actionQueue,
      );
      if (isAnyActionToBeDismissed && !isConnected) {
        next(dismissActionsFromQueue(action.type));
      }
    }

    // Proxy the original action to the next middleware on the chain or final dispatch
    return next(action);
  };
}

export default createNetworkMiddleware;
