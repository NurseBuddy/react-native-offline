import { Middleware, Dispatch } from 'redux';
import { NetworkState } from '../types';
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
export declare const createReleaseQueue: (getState: () => State, next: StoreDispatch, delay: number, shouldDequeueSelector: (state: State) => boolean) => () => Promise<void>;
declare function createNetworkMiddleware({ regexActionType, actionTypes, queueReleaseThrottle, shouldDequeueSelector, }?: Partial<Arguments>): Middleware<{}, State, Dispatch>;
export default createNetworkMiddleware;
