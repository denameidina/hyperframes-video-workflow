// Studio tab Musik: the BGM catalog in shared/music/ (ADR-0024, RD-05-20). Writes go through scripts/lib/music.mjs.
import { musicPath, readCatalog, setRejected } from '../lib/music.mjs';
import { HttpError } from './http.mjs';

export const listMusic = (root) => readCatalog(root).tracks;

export function musicFile(root, id) {
  try {
    return musicPath(root, id);
  } catch (e) {
    throw new HttpError(404, e.message);
  }
}

export function rejectMusic(root, id, rejected) {
  if (typeof rejected !== 'boolean') throw new HttpError(400, 'rejected must be true or false');
  try {
    return setRejected(root, id, rejected);
  } catch (e) {
    throw new HttpError(404, e.message);
  }
}
