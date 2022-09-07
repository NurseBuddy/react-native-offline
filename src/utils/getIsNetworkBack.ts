import { EnqueuedAction } from '../types';
import * as actionTypes from '../redux/actionTypes';

export function isNetworkBack(action: EnqueuedAction) {
  if (typeof action === 'object' && 'type' in action) {
    return action.type === actionTypes.CONNECTION_CHANGE && action.payload;
  }
  return false;
}
