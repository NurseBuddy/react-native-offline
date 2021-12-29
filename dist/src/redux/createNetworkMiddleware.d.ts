import { Middleware, Dispatch } from 'redux';
import { NetworkState, EnqueuedAction } from '../types';
declare type State = {
    network: NetworkState;
};
declare type ActionType = Array<string> | string;
declare type Arguments = {
    regexActionType: RegExp;
    actionTypes: ActionType;
    queueReleaseThrottle: number;
    shouldDequeueSelector: (state: State) => boolean;
};
declare type StoreDispatch = (...args: any[]) => any;
export declare const createReleaseNextAction: (dispatch: StoreDispatch) => (queue: EnqueuedAction[]) => Promise<void>;
declare function createNetworkMiddleware({ regexActionType, actionTypes, }?: Partial<Arguments>): Middleware<{}, State, Dispatch>;
export default createNetworkMiddleware;
